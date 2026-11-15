"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createReservation, dayString, HOLD_MINUTES, parseDay, UnitsTakenError, validStay } from "@/lib/booking";
import { isLocale } from "@/lib/i18n";
import { createOrder, vivaConfigured } from "@/lib/viva";

const guest = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  consent: z.literal("on"),
  adults: z.coerce.number().int().min(1).max(11),
  children: z.coerce.number().int().min(0).max(10),
});

/** Hold the selected rooms, open a Viva payment order and send the guest to Viva's checkout page. */
export async function reserve(formData: FormData) {
  const locale = String(formData.get("locale"));
  if (!isLocale(locale)) return;
  const checkIn = parseDay(String(formData.get("in")));
  const checkOut = parseDay(String(formData.get("out")));
  const back = (error: string) => {
    const query = new URLSearchParams({ in: String(formData.get("in")), out: String(formData.get("out")), adults: String(formData.get("adults")), children: String(formData.get("children")), error });
    return `/${locale}/booking?${query}#rooms`;
  };
  if (!validStay(checkIn, checkOut) || !checkOut) redirect(`/${locale}/booking`);

  const unitIds = formData.getAll("unit").map(String);
  if (!unitIds.length) redirect(back("select"));
  const parsed = guest.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(back("form"));
  const data = parsed.data;

  const units = await db.unit.findMany({ where: { id: { in: unitIds }, active: true } });
  const capacity = units.reduce((sum, unit) => sum + unit.capacity, 0);
  if (data.adults + data.children > capacity) redirect(back("capacity"));

  let reservation;
  try {
    reservation = await createReservation({
      unitIds, checkIn, checkOut, adults: data.adults, children: data.children,
      guestName: data.name, guestEmail: data.email.toLowerCase(), guestPhone: data.phone, notes: data.notes, locale,
    });
  } catch (error) {
    if (error instanceof UnitsTakenError) redirect(back("taken"));
    throw error;
  }

  let checkoutUrl: string;
  try {
    if (!vivaConfigured()) throw new Error("Viva credentials are not set");
    const order = await createOrder({
      amountCents: reservation.dueCents,
      reference: reservation.code,
      description: `Ephyria Lux ${reservation.code}, ${dayString(checkIn)} - ${dayString(checkOut)}`,
      email: reservation.guestEmail,
      fullName: reservation.guestName,
      phone: reservation.guestPhone ?? undefined,
      locale,
      timeoutSeconds: HOLD_MINUTES * 60,
    });
    await db.reservation.update({ where: { id: reservation.id }, data: { vivaOrderCode: order.orderCode } });
    checkoutUrl = order.checkoutUrl;
  } catch (error) {
    // No payment page, so release the dates at once instead of holding them for nothing.
    console.error("[booking] could not open the payment order:", error);
    await db.reservation.update({ where: { id: reservation.id }, data: { status: "CANCELLED", holdExpiresAt: null } });
    redirect(back("payment"));
  }
  redirect(checkoutUrl);
}
