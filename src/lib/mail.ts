// Mailgun over plain fetch. Without an API key nothing is sent (the reservation still works).
import { getSettings } from "./settings";

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const s = await getSettings();
  if (!s.MAILGUN_API_KEY || !s.MAILGUN_DOMAIN || !s.MAIL_FROM || !to) return false;
  const body = new URLSearchParams({ from: s.MAIL_FROM, to, subject, text, ...(html ? { html } : {}) });
  try {
    const res = await fetch(`${s.MAILGUN_BASE_URL || "https://api.eu.mailgun.net"}/v3/${s.MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${s.MAILGUN_API_KEY}`).toString("base64")}` },
      body,
    });
    if (!res.ok) console.error(`[mail] HTTP ${res.status} for "${subject}"`);
    return res.ok;
  } catch (error) {
    console.error("[mail]", error);
    return false;
  }
}

/** Where staff notifications go. */
export const notifyAddress = async () => (await getSettings()).MAIL_NOTIFY;
