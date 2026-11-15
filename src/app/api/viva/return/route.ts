import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dayString } from "@/lib/booking";
import { isLocale } from "@/lib/i18n";
import { settleTransaction } from "@/lib/payments";

// Viva sends the guest back here: ?t=<transactionId>&s=<orderCode> (plus ?failed=1 from the failure URL).
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const orderCode = query.get("s") ?? "";
  const transactionId = query.get("t") ?? "";
  const to = (path: string) => NextResponse.redirect(new URL(path, process.env.APP_URL ?? request.nextUrl.origin));

  const reservation = /^\d{6,20}$/.test(orderCode) ? await db.reservation.findUnique({ where: { vivaOrderCode: orderCode } }) : null;
  if (!reservation) return to("/");
  const locale = isLocale(reservation.locale) ? reservation.locale : "en";

  let paid = false;
  if (!query.has("failed") && transactionId) {
    try {
      // Only counts when Viva says this transaction is paid and belongs to this order.
      paid = (await settleTransaction(transactionId)) === orderCode;
    } catch (error) {
      console.error("[viva return]", error);
    }
  }
  if (paid) return to(`/${locale}/booking/confirmation?code=${reservation.code}`);
  if (!query.has("failed")) return to(`/${locale}/booking/confirmation?code=${reservation.code}`); // shows "waiting for confirmation"
  const back = new URLSearchParams({ in: dayString(reservation.checkIn), out: dayString(reservation.checkOut), adults: String(reservation.adults), children: String(reservation.children), error: "failed" });
  return to(`/${locale}/booking?${back}`);
}
