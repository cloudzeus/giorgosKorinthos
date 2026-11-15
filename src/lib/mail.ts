// Mailgun over plain fetch. Without MAILGUN_API_KEY nothing is sent (the reservation still works).
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAIL_FROM } = process.env;
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAIL_FROM || !to) return false;
  const body = new URLSearchParams({ from: MAIL_FROM, to, subject, text });
  try {
    const res = await fetch(`${process.env.MAILGUN_BASE_URL ?? "https://api.eu.mailgun.net"}/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}` },
      body,
    });
    if (!res.ok) console.error(`[mail] HTTP ${res.status} for "${subject}"`);
    return res.ok;
  } catch (error) {
    console.error("[mail]", error);
    return false;
  }
}
