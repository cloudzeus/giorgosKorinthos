import { confirmPaid } from "./booking";
import { longDate, money } from "./i18n";
import { sendBookingEmail } from "./email";
import { notifyAddress, sendMail } from "./mail";
import { fmt } from "./site";
import { getTransaction } from "./viva";

/**
 * Verify a Viva transaction with Viva's API and confirm its reservation.
 * Called by both the webhook and the return page; only the first call sends the emails.
 * Returns the order code when the transaction is paid, null otherwise.
 */
export async function settleTransaction(transactionId: string): Promise<string | null> {
  const transaction = await getTransaction(transactionId);
  if (!transaction?.paid) return null;
  const reservation = await confirmPaid(transaction.orderCode, transactionId, transaction.amountCents);
  if (reservation) {
    const names = reservation.units.map((row) => row.unit.slug.toUpperCase()).join(", ");
    await Promise.all([
      sendBookingEmail("confirm", reservation, transaction.amountCents),
      sendMail(await notifyAddress(), `Νέα κράτηση ${reservation.code}`, fmt("{name} ({email}, {phone})\n{in} έως {out}\nΒίλα: {rooms}\nΠληρώθηκε: {paid}", {
        name: reservation.guestName, email: reservation.guestEmail, phone: reservation.guestPhone ?? "-",
        in: longDate(reservation.checkIn, "el"), out: longDate(reservation.checkOut, "el"), rooms: names, paid: money(reservation.dueCents, "el"),
      })),
    ]);
  }
  return transaction.orderCode;
}
