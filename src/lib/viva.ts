// Viva Payments Smart Checkout. Server only.
// Flow: OAuth2 token -> create payment order -> redirect the guest to Viva -> verify the transaction
// by asking Viva's API (never trust the redirect or the webhook body on their own).

const demo = process.env.VIVA_ENV !== "production";
const HOSTS = demo
  ? { accounts: "https://demo-accounts.vivapayments.com", api: "https://demo-api.vivapayments.com", web: "https://demo.vivapayments.com" }
  : { accounts: "https://accounts.vivapayments.com", api: "https://api.vivapayments.com", web: "https://www.vivapayments.com" };

export const vivaConfigured = () => Boolean(process.env.VIVA_CLIENT_ID && process.env.VIVA_CLIENT_SECRET && process.env.VIVA_SOURCE_CODE);

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.VIVA_CLIENT_ID}:${process.env.VIVA_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${HOSTS.accounts}/connect/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Viva token: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

export interface OrderInput {
  amountCents: number;
  reference: string; // our reservation code
  description: string; // shown to the guest
  email: string;
  fullName: string;
  phone?: string;
  locale: string;
  timeoutSeconds: number;
}

/** Create a payment order and return its order code and the checkout URL. */
export async function createOrder(input: OrderInput): Promise<{ orderCode: string; checkoutUrl: string }> {
  const res = await fetch(`${HOSTS.api}/checkout/v2/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      amount: input.amountCents,
      customerTrns: input.description,
      merchantTrns: input.reference,
      customer: { email: input.email, fullName: input.fullName, phone: input.phone || undefined, requestLang: { el: "el-GR", de: "de-DE" }[input.locale] ?? "en-GB" },
      paymentTimeout: input.timeoutSeconds, // the order dies with our hold, so a late payment cannot land on released dates
      sourceCode: process.env.VIVA_SOURCE_CODE,
      preauth: false,
      allowRecurring: false,
      maxInstallments: 0,
      disableCash: true,
      tags: ["ephyria-web"],
    }),
  });
  if (!res.ok) throw new Error(`Viva order: HTTP ${res.status} ${await res.text()}`);
  // The order code is a 16-digit number: keep it as a string end to end.
  const orderCode = String(((await res.json()) as { orderCode: number | string }).orderCode);
  return { orderCode, checkoutUrl: `${HOSTS.web}/web/checkout?ref=${orderCode}` };
}

export interface VivaTransaction {
  paid: boolean;
  orderCode: string;
  amountCents: number;
}

/** Ask Viva for the transaction. `paid` is true only for status F (finished). */
export async function getTransaction(transactionId: string): Promise<VivaTransaction | null> {
  if (!/^[0-9a-f-]{36}$/i.test(transactionId)) return null;
  const res = await fetch(`${HOSTS.api}/checkout/v2/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { statusId: string; orderCode: number | string; amount: number };
  return { paid: data.statusId === "F", orderCode: String(data.orderCode), amountCents: Math.round(data.amount * 100) };
}

/** The key Viva expects back when it verifies the webhook URL (GET). */
export async function webhookKey(): Promise<string> {
  const basic = Buffer.from(`${process.env.VIVA_MERCHANT_ID}:${process.env.VIVA_API_KEY}`).toString("base64");
  const res = await fetch(`${HOSTS.web}/api/messages/config/token`, { headers: { Authorization: `Basic ${basic}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Viva webhook key: HTTP ${res.status}`);
  return ((await res.json()) as { Key: string }).Key;
}
