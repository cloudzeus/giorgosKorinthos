// One HTML template for every message to a guest, so all communication looks like the site:
// ivory paper, the logo, serif headings, gold hairlines, olive footer. Tables and inline styles only,
// because that is what email clients render reliably. Every value is HTML-escaped.
import type { Reservation, ReservationUnit, Unit } from "@prisma/client";
import { getDict, isLocale, longDate, money, type Dict, type Locale } from "./i18n";
import { sendMail } from "./mail";
import { contact, fmt } from "./site";

const C = { paper: "#F6F3ED", card: "#FFFDF9", ink: "#262824", muted: "#555C50", gold: "#B39B78", olive: "#343F35", onOlive: "#F6F3ED", onOliveMuted: "#C9CFC2", line: "#E5DDD0", accent: "#6E5A38" };
const SERIF = "'Noto Serif Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const baseUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export interface EmailContent {
  locale: Locale;
  t: Dict;
  name: string;
  title: string;
  intro: string;
  rows?: { label: string; value: string; strong?: boolean }[];
  quote?: { label: string; text: string };
  cta?: { label: string; href: string };
}

export function renderEmail({ locale, t, name, title, intro, rows = [], quote, cta }: EmailContent): string {
  const m = t.mail;
  const row = (item: { label: string; value: string; strong?: boolean }) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};font:500 11px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted};vertical-align:top;width:42%">${esc(item.label)}</td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};font:${item.strong ? "400 22px" : "400 17px"}/1.35 ${SERIF};color:${item.strong ? C.accent : C.ink};text-align:right;vertical-align:top">${esc(item.value)}</td>
    </tr>`;
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    <tr><td align="center" style="padding:8px 0 28px">
      <a href="${baseUrl()}/${locale}" style="text-decoration:none"><img src="${baseUrl()}/brand/logo-email.png" width="200" alt="Ephyria Lux" style="display:block;border:0;width:200px;height:auto"></a>
    </td></tr>
    <tr><td style="background:${C.card};border-top:2px solid ${C.gold};padding:44px 40px 36px">
      <p style="margin:0 0 14px;font:500 11px/1.4 ${SANS};letter-spacing:3px;text-transform:uppercase;color:${C.accent}">Ephyria Lux</p>
      <h1 style="margin:0 0 22px;font:300 34px/1.15 ${SERIF};color:${C.ink};letter-spacing:-0.3px">${esc(title)}</h1>
      <p style="margin:0 0 10px;font:400 16px/1.65 ${SANS};color:${C.ink}">${esc(fmt(m.greeting, { name }))}</p>
      <p style="margin:0 0 26px;font:400 16px/1.65 ${SANS};color:${C.muted}">${esc(intro)}</p>
      ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.gold};margin:0 0 28px">${rows.map(row).join("")}</table>` : ""}
      ${quote ? `<p style="margin:0 0 8px;font:500 11px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(quote.label)}</p>
      <p style="margin:0 0 28px;padding:18px 20px;background:${C.paper};border-left:2px solid ${C.gold};font:italic 400 17px/1.55 ${SERIF};color:${C.ink};white-space:pre-wrap">${esc(quote.text)}</p>` : ""}
      ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 30px"><tr><td style="background:${C.olive};border-radius:999px">
        <a href="${esc(cta.href)}" style="display:inline-block;padding:16px 34px;font:500 12px/1 ${SANS};letter-spacing:2.5px;text-transform:uppercase;color:${C.onOlive};text-decoration:none">${esc(cta.label)}</a>
      </td></tr></table>` : ""}
      <p style="margin:0 0 4px;font:400 15px/1.6 ${SANS};color:${C.muted}">${esc(m.signoff)}</p>
      <p style="margin:0;font:italic 300 22px/1.3 ${SERIF};color:${C.ink}">${esc(m.team)}</p>
    </td></tr>
    <tr><td style="background:${C.olive};padding:28px 40px;text-align:center">
      <p style="margin:0 0 8px;font:400 14px/1.6 ${SANS};color:${C.onOlive}">${esc(m.help)}</p>
      <p style="margin:0 0 12px;font:400 14px/1.6 ${SANS}"><a href="${contact.phoneHref}" style="color:${C.onOlive};text-decoration:none">${contact.phone}</a> &nbsp;·&nbsp; <a href="mailto:${contact.email}" style="color:${C.onOlive};text-decoration:none">${contact.email}</a></p>
      <p style="margin:0;font:400 12px/1.6 ${SANS};letter-spacing:1px;color:${C.onOliveMuted}">${esc(m.footer)}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Plain-text twin of the same message, for clients that do not show HTML. */
export function renderText({ t, name, title, intro, rows = [], quote, cta }: EmailContent): string {
  return [title, "", fmt(t.mail.greeting, { name }), intro, "", ...rows.map((row) => `${row.label}: ${row.value}`), ...(quote ? ["", `${quote.label}:`, quote.text] : []), ...(cta ? ["", `${cta.label}: ${cta.href}`] : []), "", t.mail.signoff, t.mail.team, "", t.mail.footer].join("\n");
}

type Booking = Reservation & { units: (ReservationUnit & { unit: Unit })[] };
export type BookingMail = "confirm" | "change" | "cancel";

/** The content of a reservation message. `paidCents` is what the guest has paid so far. */
export async function bookingEmail(kind: BookingMail, reservation: Booking, paidCents: number): Promise<{ subject: string; content: EmailContent }> {
  const locale: Locale = isLocale(reservation.locale) ? reservation.locale : "en";
  const { t } = await getDict(locale);
  const m = t.mail, c = t.booking.confirm;
  const villas = reservation.units.map((row) => t.units[row.unit.slug as keyof typeof t.units]?.name ?? row.unit.slug).join(", ");
  const rows = [
    { label: c.code, value: reservation.code },
    { label: c.dates, value: `${longDate(reservation.checkIn, locale)} – ${longDate(reservation.checkOut, locale)}` },
    { label: c.rooms, value: villas },
    { label: t.booking.guests, value: String(reservation.adults + reservation.children) },
    ...(kind === "cancel" ? [] : [
      { label: m.total, value: money(reservation.totalCents, locale), strong: true },
      ...(paidCents ? [{ label: c.paid, value: money(paidCents, locale) }] : []),
      ...(reservation.totalCents > paidCents ? [{ label: c.balance, value: money(reservation.totalCents - paidCents, locale) }] : []),
    ]),
  ];
  return {
    subject: fmt(m[`${kind}Subject`], { code: reservation.code }),
    content: {
      locale, t, name: reservation.guestName, title: m[`${kind}Title`], intro: m[`${kind}Intro`], rows,
      cta: kind === "cancel" ? undefined : { label: m.view, href: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${locale}/booking/confirmation?code=${reservation.code}` },
    },
  };
}

export async function sendBookingEmail(kind: BookingMail, reservation: Booking, paidCents: number): Promise<boolean> {
  if (!reservation.guestEmail) return false;
  const { subject, content } = await bookingEmail(kind, reservation, paidCents);
  return sendMail(reservation.guestEmail, subject, renderText(content), renderEmail(content));
}

/** Acknowledgement of a contact message or a request made during the stay. */
export async function sendAckEmail(kind: "inquiry" | "request", to: string, name: string, localeRaw: string, message: string, code = ""): Promise<boolean> {
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const { t } = await getDict(locale);
  const m = t.mail;
  const content: EmailContent = { locale, t, name, title: m[`${kind}Title`], intro: m[`${kind}Intro`], quote: { label: kind === "inquiry" ? m.yourMessage : m.yourRequest, text: message } };
  return sendMail(to, fmt(m[`${kind}Subject`], { code }), renderText(content), renderEmail(content));
}
