import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { db } from "@/lib/db";
import { addDays, dayString, parseDay } from "@/lib/booking";
import { alternates, getDict, isLocale } from "@/lib/i18n";
import { notifyAddress, sendMail } from "@/lib/mail";
import { sendAckEmail } from "@/lib/email";
import { PageIntro } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/stay">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.stay.eyebrow, description: t.stay.lead, alternates: alternates("/stay", locale), robots: { index: false } };
}

const KIND = { request: "GUEST_REQUEST", cleaning: "CLEANING", problem: "MAINTENANCE" } as const;

async function send(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale"));
  if (!isLocale(locale)) return;
  const fail = () => redirect(`/${locale}/stay?error=1`);
  if (formData.get("website")) redirect(`/${locale}/stay?sent=1`); // honeypot
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const kind = String(formData.get("kind")) as keyof typeof KIND;
  if (!/^EL-[0-9A-F]{8,12}$/.test(code) || !email || message.length < 3 || !(kind in KIND)) fail();
  // The code and the booking email must both match a confirmed stay that is current or about to start.
  // The same answer is given for every mismatch, so the form cannot be used to test which codes exist.
  const today = parseDay(dayString(new Date()))!;
  const reservation = await db.reservation.findFirst({ where: { code, guestEmail: email, status: "CONFIRMED", checkIn: { lte: addDays(today, 14) }, checkOut: { gte: today } }, include: { units: true } });
  if (!reservation) fail();
  const recent = await db.ticket.count({ where: { reservationId: reservation!.id, createdAt: { gt: new Date(Date.now() - 3_600_000) }, autoKey: null } });
  if (recent >= 10) fail(); // at most ten requests an hour per reservation
  await db.ticket.create({ data: { type: KIND[kind], priority: kind === "problem" ? "HIGH" : "NORMAL", title: message.split("\n")[0].slice(0, 120), description: message, reservationId: reservation!.id, guestId: reservation!.guestId, unitId: reservation!.units[0]?.unitId, dueDate: today } });
  await Promise.all([
    sendAckEmail("request", email, reservation!.guestName, locale, message, code),
    sendMail(await notifyAddress(), `Νέο αίτημα πελάτη · ${reservation!.guestName}`, `${reservation!.guestName} (${code})\n\n${message}`),
  ]);
  redirect(`/${locale}/stay?sent=1`);
}

export default async function StayPage({ params, searchParams }: PageProps<"/[locale]/stay">) {
  const { locale, t } = await getDict((await params).locale);
  const query = await searchParams;
  const s = t.stay;
  return (
    <>
      <PageIntro eyebrow={s.eyebrow} lines={s.lines} lead={s.lead} />
      <section className="ep-container" style={{ paddingBottom: "var(--section)" }}>
        <form className="ep-form" action={send} style={{ maxWidth: 720 }}>
          <input type="hidden" name="locale" value={locale} />
          <div className="ep-hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {query.sent ? <p className="ep-note" role="status"><CircleCheck aria-hidden="true" strokeWidth={1.5} />{s.sent}</p> : null}
          {query.error ? <p className="ep-note ep-note--danger" role="alert"><CircleAlert aria-hidden="true" strokeWidth={1.5} />{s.error}</p> : null}
          <div className="ep-form__row">
            <div className="mr-field"><label className="mr-label" htmlFor="s-code">{s.code} *</label><input className="mr-input" id="s-code" name="code" defaultValue={typeof query.code === "string" ? query.code : ""} autoComplete="off" required aria-describedby="s-code-hint" /><p className="mr-hint" id="s-code-hint">{s.codeHint}</p></div>
            <div className="mr-field"><label className="mr-label" htmlFor="s-email">{s.email} *</label><input className="mr-input" id="s-email" name="email" type="email" autoComplete="email" required /></div>
          </div>
          <div className="mr-field"><label className="mr-label" htmlFor="s-kind">{s.kind}</label><select className="mr-input" id="s-kind" name="kind" defaultValue="request">{(Object.keys(s.kinds) as (keyof typeof s.kinds)[]).map((id) => <option key={id} value={id}>{s.kinds[id]}</option>)}</select></div>
          <div className="mr-field"><label className="mr-label" htmlFor="s-message">{s.message} *</label><textarea className="mr-input" id="s-message" name="message" rows={5} required /></div>
          <div><button className="mr-btn" type="submit">{s.send}</button></div>
        </form>
      </section>
    </>
  );
}
