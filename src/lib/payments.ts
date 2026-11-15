import { confirmPaid } from "./booking";
import { getDict, longDate, money, type Locale, isLocale } from "./i18n";
import { sendMail } from "./mail";
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
    const locale: Locale = isLocale(reservation.locale) ? reservation.locale : "en";
    const { t } = getDict(locale);
    const c = t.booking.confirm;
    const rooms = reservation.units.map((row) => t.units[row.unit.slug as keyof typeof t.units]?.name ?? row.unit.slug).join(", ");
    const lines = [
      c.text,
      "",
      `${c.code}: ${reservation.code}`,
      `${c.dates}: ${longDate(reservation.checkIn, locale)} - ${longDate(reservation.checkOut, locale)}`,
      `${c.rooms}: ${rooms}`,
      `${c.paid}: ${money(reservation.dueCents, locale)}`,
      ...(reservation.totalCents > reservation.dueCents ? [`${c.balance}: ${money(reservation.totalCents - reservation.dueCents, locale)}`] : []),
      "",
      "Ephyria Lux",
      t.contact.address,
    ];
    await Promise.all([
      sendMail(reservation.guestEmail, `${c.eyebrow} ${reservation.code}`, lines.join("\n")),
      sendMail(process.env.MAIL_NOTIFY ?? "", `Νέα κράτηση ${reservation.code}`, fmt("{name} ({email}, {phone})\n{in} έως {out}\n{rooms}\nΠληρώθηκε: {paid}", {
        name: reservation.guestName, email: reservation.guestEmail, phone: reservation.guestPhone ?? "-",
        in: longDate(reservation.checkIn, "el"), out: longDate(reservation.checkOut, "el"), rooms, paid: money(reservation.dueCents, "el"),
      })),
    ]);
  }
  return transaction.orderCode;
}
