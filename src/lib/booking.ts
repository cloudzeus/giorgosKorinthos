import { Prisma, type ExtraPricing, type RatePeriod, type Reservation } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { db } from "./db";

export const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES ?? 20);
export const DEPOSIT_PERCENT = Math.min(100, Math.max(1, Number(process.env.BOOKING_DEPOSIT_PERCENT ?? 100)));

/** "2026-07-01" -> UTC midnight Date, or null when the string is not a real date. */
export function parseDay(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export const dayString = (date: Date) => date.toISOString().slice(0, 10);
export const nightsBetween = (checkIn: Date, checkOut: Date) => Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/** A stay is valid when it starts today or later, lasts 1 to 60 nights. */
export function validStay(checkIn: Date | null, checkOut: Date | null, today = new Date()): checkIn is Date {
  if (!checkIn || !checkOut) return false;
  const nights = nightsBetween(checkIn, checkOut);
  return nights >= 1 && nights <= 60 && dayString(checkIn) >= dayString(today);
}

type Rate = Pick<RatePeriod, "from" | "to" | "priceCents" | "minNights">;

/**
 * Price of a stay in one villa. Each night costs the seasonal rate that covers it, or the base price.
 * When periods overlap, the one that starts latest wins. minNights comes from the arrival night's period.
 */
export function stayPrice(baseCents: number, rates: Rate[], checkIn: Date, checkOut: Date) {
  const ordered = [...rates].sort((a, b) => b.from.getTime() - a.from.getTime());
  const rateFor = (night: Date) => ordered.find((rate) => rate.from <= night && night <= rate.to);
  let totalCents = 0;
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) totalCents += rateFor(night)?.priceCents ?? baseCents;
  return { totalCents, minNights: rateFor(checkIn)?.minNights ?? 1 };
}

/** What an extra service costs for a stay: once, per night, or per guest. */
export function extraTotal(priceCents: number, pricing: ExtraPricing, nights: number, guests: number) {
  return priceCents * (pricing === "PER_NIGHT" ? nights : pricing === "PER_PERSON" ? guests : 1);
}

/** The part of a total charged online. Money stays in integer cents. */
export const depositOf = (totalCents: number, depositPercent = DEPOSIT_PERCENT) => Math.round((totalCents * depositPercent) / 100);

/** Reservations that occupy a unit for the given dates: confirmed, blocked, or a hold that has not expired. */
const occupying = (checkIn: Date, checkOut: Date, now = new Date()): Prisma.ReservationWhereInput => ({
  checkIn: { lt: checkOut },
  checkOut: { gt: checkIn },
  OR: [{ status: { in: ["CONFIRMED", "BLOCKED"] } }, { status: "PENDING", holdExpiresAt: { gt: now } }],
});

/** Ids of units that are taken for the dates. `exceptId` ignores one reservation (when editing it). */
export async function takenUnitIds(checkIn: Date, checkOut: Date, tx: Prisma.TransactionClient = db, exceptId?: string) {
  const rows = await tx.reservationUnit.findMany({
    where: { reservation: { ...occupying(checkIn, checkOut), ...(exceptId ? { NOT: { id: exceptId } } : {}) } },
    select: { unitId: true },
  });
  return new Set(rows.map((row) => row.unitId));
}

export class UnitsTakenError extends Error {}
export class MinNightsError extends Error {
  constructor(public nights: number) { super("min nights"); }
}

export interface HoldInput {
  unitIds: string[];
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
  locale: string;
  /** Optional services the guest ticked. Ones not offered by the chosen villas are ignored. */
  extraIds?: string[];
  status?: "PENDING" | "CONFIRMED" | "BLOCKED";
  source?: "WEB" | "MANUAL";
}

/** Availability check and prices for a set of villas, inside the caller's transaction. */
async function priceUnits(tx: Prisma.TransactionClient, unitIds: string[], checkIn: Date, checkOut: Date, exceptId?: string) {
  const taken = await takenUnitIds(checkIn, checkOut, tx, exceptId);
  if (unitIds.some((id) => taken.has(id))) throw new UnitsTakenError();
  const units = await tx.unit.findMany({ where: { id: { in: unitIds }, active: true }, include: { rates: true } });
  if (units.length !== unitIds.length || !units.length) throw new UnitsTakenError();
  const nights = nightsBetween(checkIn, checkOut);
  const priced = units.map((unit) => ({ unit, ...stayPrice(unit.priceCents, unit.rates, checkIn, checkOut) }));
  return { priced, nights, totalCents: priced.reduce((sum, row) => sum + row.totalCents, 0), minNights: Math.max(...priced.map((row) => row.minNights)) };
}

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

/** Run a booking transaction; on a serialization conflict with a concurrent booking, one retry settles who won. */
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return run();
    throw error;
  }
}

/**
 * Reserve villas for the dates. The availability check and the insert run in one serializable
 * transaction, so two guests cannot take the same villa for overlapping dates.
 */
export function createReservation(input: HoldInput): Promise<Reservation> {
  return withRetry(() =>
    db.$transaction(async (tx) => {
      const { priced, nights, totalCents, minNights } = await priceUnits(tx, input.unitIds, input.checkIn, input.checkOut);
      const status = input.status ?? "PENDING";
      // Guests booking online must respect the season's minimum stay; staff may override it.
      if (input.source !== "MANUAL" && nights < minNights) throw new MinNightsError(minNights);
      const offered = input.extraIds?.length
        ? await tx.extra.findMany({ where: { id: { in: input.extraIds }, active: true, units: { some: { id: { in: input.unitIds } } } }, include: { translations: true } })
        : [];
      const extras = offered.map((extra) => ({
        extraId: extra.id,
        name: (extra.translations.find((row) => row.locale === input.locale) ?? extra.translations.find((row) => row.locale === "el") ?? extra.translations[0])?.name ?? "Extra",
        priceCents: extraTotal(extra.priceCents, extra.pricing, nights, input.adults + input.children),
      }));
      const grandTotal = totalCents + extras.reduce((sum, row) => sum + row.priceCents, 0);
      const email = input.guestEmail.trim().toLowerCase();
      const guest = email && status !== "BLOCKED"
        ? await tx.guest.upsert({
            where: { email },
            update: { name: input.guestName, ...(input.guestPhone ? { phone: input.guestPhone } : {}) },
            create: { email, name: input.guestName, phone: input.guestPhone || null, language: input.locale },
          })
        : null;
      return tx.reservation.create({
        data: {
          code: `EL-${randomBytes(6).toString("hex").toUpperCase()}`,
          status,
          source: input.source ?? "WEB",
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          adults: input.adults,
          children: input.children,
          guestName: input.guestName,
          guestEmail: email,
          guestPhone: input.guestPhone || null,
          notes: input.notes || null,
          locale: input.locale,
          guestId: guest?.id,
          totalCents: status === "BLOCKED" ? 0 : grandTotal,
          dueCents: status === "BLOCKED" ? 0 : depositOf(grandTotal),
          holdExpiresAt: status === "PENDING" ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
          consentAt: input.source === "MANUAL" ? null : new Date(),
          units: { create: priced.map((row) => ({ unitId: row.unit.id, priceCents: Math.round(row.totalCents / nights) })) },
          extras: { create: status === "BLOCKED" ? [] : extras },
        },
      });
    }, serializable),
  );
}

/** Move a reservation to other dates and/or villas, re-checking availability and re-pricing it. */
export function rescheduleReservation(id: string, unitIds: string[], checkIn: Date, checkOut: Date, reprice: boolean): Promise<Reservation> {
  return withRetry(() =>
    db.$transaction(async (tx) => {
      const { priced, nights, totalCents } = await priceUnits(tx, unitIds, checkIn, checkOut, id);
      await tx.reservationUnit.deleteMany({ where: { reservationId: id } });
      // Extras keep the amount they were sold for; only the villa nights are re-priced.
      const extras = await tx.reservationExtra.aggregate({ where: { reservationId: id }, _sum: { priceCents: true } });
      return tx.reservation.update({
        where: { id },
        data: {
          checkIn, checkOut,
          ...(reprice ? { totalCents: totalCents + (extras._sum.priceCents ?? 0) } : {}),
          units: { create: priced.map((row) => ({ unitId: row.unit.id, priceCents: Math.round(row.totalCents / nights) })) },
        },
      });
    }, serializable),
  );
}

/**
 * Mark a held reservation as paid. Idempotent: the webhook and the return page may both call it.
 * Returns the reservation only the first time it flips to CONFIRMED.
 */
export async function confirmPaid(orderCode: string, transactionId: string, amountCents: number) {
  const reservation = await db.reservation.findUnique({ where: { vivaOrderCode: orderCode } });
  if (!reservation || reservation.status !== "PENDING") return null;
  if (amountCents !== reservation.dueCents) {
    console.error(`[booking] amount mismatch for ${reservation.code}: paid ${amountCents}, due ${reservation.dueCents}`);
    return null;
  }
  const updated = await db.reservation.updateMany({
    where: { id: reservation.id, status: "PENDING" },
    data: { status: "CONFIRMED", vivaTransactionId: transactionId, holdExpiresAt: null },
  });
  if (!updated.count) return null;
  await db.payment.create({ data: { reservationId: reservation.id, amountCents, method: "VIVA", note: transactionId } });
  return db.reservation.findUnique({ where: { id: reservation.id }, include: { units: { include: { unit: true } }, extras: true } });
}
