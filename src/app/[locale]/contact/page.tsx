import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { z } from "zod";
import { db } from "@/lib/db";
import { alternates, getDict, isLocale } from "@/lib/i18n";
import { notifyAddress, sendMail } from "@/lib/mail";
import { sendAckEmail } from "@/lib/email";
import { contact as info, img } from "@/lib/site";
import { ImageMaskReveal } from "@/components/ds/ImageMaskReveal";
import { PageIntro } from "@/components/site/parts";
import ConciergePanel from "@/components/site/ConciergePanel";

const CONCIERGE_URL = process.env.NEXT_PUBLIC_CONCIERGE_URL ?? "https://video.ephyria.gr";
const CONCIERGE_COMPANY_ID = process.env.NEXT_PUBLIC_CONCIERGE_COMPANY_ID ?? "";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.nav.contact, description: t.contact.lead, alternates: alternates("/contact", locale) };
}

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(5).max(4000),
  consent: z.literal("on"),
});

async function send(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale"));
  if (!isLocale(locale)) return;
  // Honeypot: real visitors never fill this hidden field.
  if (formData.get("website")) redirect(`/${locale}/contact?sent=1`);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/contact?error=1`);
  const { name, email, phone, message } = parsed.data;
  const address = email.toLowerCase();
  const guest = await db.guest.upsert({ where: { email: address }, update: {}, create: { email: address, name, phone: phone || null, language: locale } });
  await db.inquiry.create({ data: { name, email: address, phone: phone || null, message, locale, consentAt: new Date(), guestId: guest.id } });
  await sendAckEmail("inquiry", address, name, locale, message);
  await sendMail(await notifyAddress(), `Νέο μήνυμα από ${name}`, `${name} <${email}> ${phone ?? ""}\n\n${message}`);
  redirect(`/${locale}/contact?sent=1`);
}

export default async function ContactPage({ params, searchParams }: PageProps<"/[locale]/contact">) {
  const { locale, t } = await getDict((await params).locale);
  const query = await searchParams;
  const c = t.contact;
  return (
    <>
      <PageIntro eyebrow={c.eyebrow} lines={c.lines} lead={c.lead} />
      {CONCIERGE_COMPANY_ID ? (
        <section className="ep-container ep-stack" style={{ paddingBottom: "var(--section)" }}>
          <div className="ep-stack">
            <p className="mr-eyebrow">{c.concierge.eyebrow}</p>
            <h2 className="ep-display">{c.concierge.title}</h2>
            <p className="mr-lead mr-muted">{c.concierge.lead}</p>
          </div>
          <ConciergePanel
            strings={c.concierge}
            conciergeUrl={CONCIERGE_URL}
            companyId={CONCIERGE_COMPANY_ID}
            hotelName="Ephyria Lux"
            locale={locale}
          />
        </section>
      ) : null}
      <section className="ep-container ep-book" style={{ paddingBottom: "var(--section)" }}>
        <form className="ep-form" action={send}>
          <input type="hidden" name="locale" value={locale} />
          <div className="ep-hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {query.sent ? <p className="ep-note" role="status"><CircleCheck aria-hidden="true" strokeWidth={1.5} />{c.sent}</p> : null}
          {query.error ? <p className="ep-note ep-note--danger" role="alert"><CircleAlert aria-hidden="true" strokeWidth={1.5} />{c.error}</p> : null}
          <div className="ep-form__row">
            <div className="mr-field"><label className="mr-label" htmlFor="c-name">{c.name} *</label><input className="mr-input" id="c-name" name="name" autoComplete="name" required /></div>
            <div className="mr-field"><label className="mr-label" htmlFor="c-email">{c.email} *</label><input className="mr-input" id="c-email" name="email" type="email" autoComplete="email" required /></div>
          </div>
          <div className="mr-field"><label className="mr-label" htmlFor="c-phone">{c.phone}</label><input className="mr-input" id="c-phone" name="phone" type="tel" autoComplete="tel" /></div>
          <div className="mr-field"><label className="mr-label" htmlFor="c-message">{c.message} *</label><textarea className="mr-input" id="c-message" name="message" rows={6} required /></div>
          <label className="ep-check"><input type="checkbox" name="consent" required /><span>{c.consent}</span></label>
          <div><button className="mr-btn" type="submit">{c.send}</button></div>
        </form>
        <aside className="ep-stack ep-book__aside">
          <ImageMaskReveal src={img("outdoor-06")} alt={t.alt.entrance} ratio="4 / 3" />
          <dl className="ep-sum">
            <div><dt>{c.phoneLabel}</dt><dd><a href={info.phoneHref}>{info.phone}</a></dd></div>
            <div><dt>{c.emailLabel}</dt><dd><a href={`mailto:${info.email}`}>{info.email}</a></dd></div>
            <div><dt>{c.addressLabel}</dt><dd>{c.address}</dd></div>
          </dl>
        </aside>
      </section>
    </>
  );
}
