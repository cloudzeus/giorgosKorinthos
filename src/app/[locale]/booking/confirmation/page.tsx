import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { getDict, longDate, money } from "@/lib/i18n";
import { fmt, type UnitSlug } from "@/lib/site";
import { PageIntro } from "@/components/site/parts";
import { BookingConversion } from "@/components/site/consent";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { robots: { index: false } };

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/[locale]/booking/confirmation">) {
  const { locale, t } = await getDict((await params).locale);
  const code = String((await searchParams).code ?? "");
  const c = t.booking.confirm;
  const reservation = /^EL-[0-9A-F]{8,12}$/.test(code)
    ? await db.reservation.findUnique({ where: { code }, include: { units: { include: { unit: true } } } })
    : null;
  const confirmed = reservation?.status === "CONFIRMED";

  if (!reservation || (!confirmed && reservation.status !== "PENDING")) {
    return <PageIntro eyebrow={t.booking.eyebrow} lines={[c.notFound]} />;
  }
  // Mask the address: this page is reachable by anyone who has the code.
  const settings = await getSettings();
  const masked = reservation.guestEmail.replace(/^(.).*(@.*)$/, "$1***$2");
  return (
    <>
      <PageIntro eyebrow={confirmed ? c.eyebrow : t.booking.eyebrow} lines={confirmed ? c.lines : [c.pendingTitle]} lead={confirmed ? c.text : c.pendingText} />
      <section className="ep-container ep-stack ep-stack--lg" style={{ paddingBottom: "var(--section)", maxWidth: 880, marginInline: 0 }}>
        <p className={confirmed ? "ep-note" : "ep-note ep-note--warn"} role="status">
          {confirmed ? <CircleCheck aria-hidden="true" strokeWidth={1.5} /> : <Clock aria-hidden="true" strokeWidth={1.5} />}
          {confirmed ? fmt(c.emailSent, { email: masked }) : c.pendingText}
        </p>
        <dl className="ep-sum ep-panel">
          <div><dt>{c.code}</dt><dd><strong>{reservation.code}</strong></dd></div>
          <div><dt>{c.dates}</dt><dd>{longDate(reservation.checkIn, locale)} - {longDate(reservation.checkOut, locale)}</dd></div>
          <div><dt>{c.rooms}</dt><dd>{reservation.units.map((row) => t.units[row.unit.slug as UnitSlug]?.name ?? row.unit.slug).join(", ")}</dd></div>
          {confirmed ? <div className="ep-sum__total"><dt>{c.paid}</dt><dd>{money(reservation.dueCents, locale)}</dd></div> : null}
          {confirmed && reservation.totalCents > reservation.dueCents ? <div><dt>{c.balance}</dt><dd>{money(reservation.totalCents - reservation.dueCents, locale)}</dd></div> : null}
        </dl>
        {confirmed ? <p className="mr-hint"><Link href={`/${locale}/stay?code=${reservation.code}`}>{t.stay.eyebrow}: {t.stay.lines.join(" ")}</Link></p> : null}
        <div><Link className="mr-btn mr-btn--secondary" href={`/${locale}`}>{c.home}</Link></div>
        {confirmed ? <BookingConversion code={reservation.code} value={reservation.totalCents / 100} ads={settings.GOOGLE_ADS_ID} label={settings.GOOGLE_ADS_BOOKING_LABEL} /> : null}
      </section>
    </>
  );
}
