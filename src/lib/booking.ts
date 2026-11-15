import { Prisma, type Reservation } from "@prisma/client";
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

/** A stay is valid when it starts today or later, lasts 1 to 60 nights. */
export function validStay(checkIn: Date | null, checkOut: Date | null, today = new Date()): checkIn is Date {
  if (!checkIn || !checkOut) return false;
  const nights = nightsBetween(checkIn, checkOut);
  return nights >= 1 && nights <= 60 && dayString(checkIn) >= dayString(today);
}

/** Total for the stay and the part charged online. Money stays in integer cents. */
export function quote(nightlyCents: number[], nights: number, depositPercent = DEPOSIT_PERCENT) {
  const totalCents = nightlyCents.reduce((sum, price) => sum + price, 0) * nights;
  const dueCents = Math.round((totalCents * depositPercent) / 100);
  return { totalCents, dueCents };
}

/** Reservations that occupy a unit for the given dates: confirmed, blocked, or a hold that has not expired. */
const occupying = (checkIn: Date, checkOut: Date, now = new Date()): Prisma.ReservationWhereInput => ({
  checkIn: { lt: checkOut },
  checkOut: { gt: checkIn },
  OR: [{ status: { in: ["CONFIRMED", "BLOCKED"] } }, { status: "PENDING", holdExpiresAt: { gt: now } }],
});

/** Ids of units that are taken for the dates. */
export async function takenUnitIds(checkIn: Date, checkOut: Date, tx: Prisma.TransactionClient = db) {
  const rows = await tx.reservationUnit.findMany({ where: { reservation: occupying(checkIn, checkOut) }, select: { unitId: true } });
  return new Set(rows.map((row) => row.unitId));
}

export class UnitsTakenError extends Error {}

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
  status?: "PENDING" | "CONFIRMED" | "BLOCKED";
  source?: "WEB" | "MANUAL";
}

/**
 * Reserve units for the dates. The availability check and the insert run in one serializable
 * transaction, so two guests cannot take the same room for overlapping dates.
 */
export async function createReservation(input: HoldInput): Promise<Reservation> {
  const run = () =>
    db.$transaction(
      async (tx) => {
        const taken = await takenUnitIds(input.checkIn, input.checkOut, tx);
        if (input.unitIds.some((id) => taken.has(id))) throw new UnitsTakenError();
        const units = await tx.unit.findMany({ where: { id: { in: input.unitIds }, active: true } });
        if (units.length !== input.unitIds.length || !units.length) throw new UnitsTakenError();
        const status = input.status ?? "PENDING";
        const priced = quote(units.map((unit) => unit.priceCents), nightsBetween(input.checkIn, input.checkOut));
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
            guestEmail: input.guestEmail,
            guestPhone: input.guestPhone || null,
            notes: input.notes || null,
            locale: input.locale,
            totalCents: status === "BLOCKED" ? 0 : priced.totalCents,
            dueCents: status === "BLOCKED" ? 0 : priced.dueCents,
            holdExpiresAt: status === "PENDING" ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
            consentAt: input.source === "MANUAL" ? null : new Date(),
            units: { create: units.map((unit) => ({ unitId: unit.id, priceCents: unit.priceCents })) },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  try {
    return await run();
  } catch (error) {
    // P2034: serialization conflict with a concurrent booking. One retry settles who won.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return run();
    throw error;
  }
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
  return updated.count ? db.reservation.findUnique({ where: { id: reservation.id }, include: { units: { include: { unit: true } } } }) : null;
}
