// Integration settings: the admin's values (encrypted in the database) win over the .env values.
// Server only. Secrets are never sent back to the browser, only a mask of their last characters.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const SETTINGS = [
  { group: "Bunny CDN", hint: "Αποθήκευση και διανομή φωτογραφιών και βίντεο.", fields: [
    { key: "BUNNY_STORAGE_ZONE", label: "Όνομα storage zone" },
    { key: "BUNNY_STORAGE_KEY", label: "Κωδικός storage zone (Password)", secret: true },
    { key: "BUNNY_STORAGE_HOST", label: "Διακομιστής storage", placeholder: "storage.bunnycdn.com" },
    { key: "BUNNY_CDN_URL", label: "Διεύθυνση Pull Zone", placeholder: "https://ephyria.b-cdn.net" },
  ] },
  { group: "Mailgun", hint: "Αποστολή email επιβεβαίωσης κράτησης και ειδοποιήσεων.", fields: [
    { key: "MAILGUN_API_KEY", label: "API key", secret: true },
    { key: "MAILGUN_DOMAIN", label: "Domain αποστολής", placeholder: "mg.example.com" },
    { key: "MAILGUN_BASE_URL", label: "Περιοχή API", placeholder: "https://api.eu.mailgun.net" },
    { key: "MAIL_FROM", label: "Αποστολέας", placeholder: "Ephyria Lux <reservations@example.com>" },
    { key: "MAIL_NOTIFY", label: "Email για ειδοποιήσεις προς εσάς" },
  ] },
  { group: "Viva Payments", hint: "Online πληρωμές κρατήσεων (Smart Checkout).", fields: [
    { key: "VIVA_ENV", label: "Περιβάλλον", options: [{ value: "demo", label: "Δοκιμαστικό (demo)" }, { value: "production", label: "Πραγματικές χρεώσεις (production)" }] },
    { key: "VIVA_CLIENT_ID", label: "Client ID" },
    { key: "VIVA_CLIENT_SECRET", label: "Client secret", secret: true },
    { key: "VIVA_MERCHANT_ID", label: "Merchant ID" },
    { key: "VIVA_API_KEY", label: "API key", secret: true },
    { key: "VIVA_SOURCE_CODE", label: "Κωδικός πηγής πληρωμής", placeholder: "1234" },
  ] },
  { group: "OpenRouter (AI)", hint: "Αυτόματη συγγραφή άρθρων για την Κόρινθο στις τρεις γλώσσες.", fields: [
    { key: "AI_API_KEY", label: "API key", secret: true },
    { key: "AI_MODEL", label: "Μοντέλο", placeholder: "anthropic/claude-sonnet-5.5" },
    { key: "AI_BASE_URL", label: "Διεύθυνση API", placeholder: "https://openrouter.ai/api/v1" },
    { key: "AI_AUTO_PUBLISH", label: "Νέα άρθρα", options: [{ value: "false", label: "Μένουν πρόχειρα μέχρι να τα εγκρίνω" }, { value: "true", label: "Δημοσιεύονται αμέσως" }] },
  ] },
  { group: "Google", hint: "Μετρήσεις επισκεψιμότητας και διαφημίσεων. Φορτώνουν μόνο αφού ο επισκέπτης δεχτεί τα cookies.", fields: [
    { key: "GA_MEASUREMENT_ID", label: "Google Analytics 4 (Measurement ID)", placeholder: "G-XXXXXXXXXX", pattern: "G-[A-Z0-9]{6,14}" },
    { key: "GOOGLE_ADS_ID", label: "Google Ads tag (Conversion ID)", placeholder: "AW-123456789", pattern: "AW-[0-9]{6,14}" },
    { key: "GOOGLE_ADS_BOOKING_LABEL", label: "Ετικέτα μετατροπής «Κράτηση»", placeholder: "AbC-D_efG-h12_34-567" },
    { key: "GTM_ID", label: "Google Tag Manager (προαιρετικό)", placeholder: "GTM-XXXXXXX", pattern: "GTM-[A-Z0-9]{4,10}" },
  ] },
] as const;

type Field = { key: string; label: string; secret?: boolean; placeholder?: string; pattern?: string; options?: readonly { value: string; label: string }[] };
export const FIELDS: Field[] = SETTINGS.flatMap((group) => [...group.fields]);
export type SettingKey = (typeof SETTINGS)[number]["fields"][number]["key"];

const secretKey = () => createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest();

function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}

function decrypt(packed: string): string | null {
  try {
    const [iv, tag, body] = packed.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null; // AUTH_SECRET changed: the stored value is unreadable, fall back to .env
  }
}

let memo: { at: number; values: Record<string, string> } | null = null;

/** All settings: database value if set, else the environment variable, else "". Cached for 30 seconds. */
export async function getSettings(): Promise<Record<SettingKey, string>> {
  if (!memo || Date.now() - memo.at > 30_000) {
    const rows = await db.setting.findMany();
    const stored = new Map(rows.map((row) => [row.key, decrypt(row.value)]));
    memo = { at: Date.now(), values: Object.fromEntries(FIELDS.map((field) => [field.key, stored.get(field.key) || process.env[field.key] || ""])) };
  }
  return memo.values as Record<SettingKey, string>;
}

/** Save the given values. An empty string removes the override (the .env value applies again). */
export async function saveSettings(values: Partial<Record<SettingKey, string>>) {
  for (const [key, value] of Object.entries(values)) {
    if (!FIELDS.some((field) => field.key === key)) continue;
    if (value) await db.setting.upsert({ where: { key }, update: { value: encrypt(value) }, create: { key, value: encrypt(value) } });
    else await db.setting.deleteMany({ where: { key } });
  }
  memo = null;
}

export const mask = (value: string) => (value ? `••••${value.slice(-4)}` : "");
