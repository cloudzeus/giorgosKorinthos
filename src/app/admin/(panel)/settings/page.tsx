import Link from "next/link";
import { requirePermission } from "@/auth";
import { getSettings, mask, SETTINGS } from "@/lib/settings";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { Alert, PageHead } from "@/components/admin/parts";
import { saveIntegrationSettings } from "../../ops-actions";

export const metadata = { title: "Ρυθμίσεις" };

const REQUIRED: Record<string, string[]> = {
  "Bunny CDN": ["BUNNY_STORAGE_ZONE", "BUNNY_STORAGE_KEY", "BUNNY_CDN_URL"],
  Mailgun: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAIL_FROM"],
  "Viva Payments": ["VIVA_CLIENT_ID", "VIVA_CLIENT_SECRET", "VIVA_SOURCE_CODE"],
  "OpenRouter (AI)": ["AI_API_KEY", "AI_MODEL"],
  Google: [],
};

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requirePermission("settings.write");
  const query = await searchParams;
  const values = await getSettings() as Record<string, string>;
  const app = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return (
    <>
      <PageHead title="Ρυθμίσεις" text="Τα στοιχεία σύνδεσης με τις υπηρεσίες του site. Αποθηκεύονται κρυπτογραφημένα και ισχύουν αμέσως, χωρίς επανεκκίνηση. Τα μυστικά κλειδιά δεν εμφανίζονται ποτέ ολόκληρα." />
      {query.ok ? <Alert>Οι ρυθμίσεις αποθηκεύτηκαν.</Alert> : null}
      {typeof query.error === "string" ? <Alert bad>Η τιμή στο πεδίο «{query.error}» δεν έχει τη σωστή μορφή. Δεν αποθηκεύτηκε τίποτα.</Alert> : null}
      <form action={saveIntegrationSettings} className="ad-settings">
        {SETTINGS.map((group) => {
          const need = REQUIRED[group.group];
          const ready = need.length ? need.every((key) => values[key]) : group.fields.some((field) => values[field.key]);
          return (
            <section className="ad-card" key={group.group}>
              <div className="ad-card__head"><h2>{group.group}</h2><Badge variant={ready ? "success" : "warning"}>{ready ? "Ρυθμισμένο" : need.length ? "Λείπουν στοιχεία" : "Δεν χρησιμοποιείται"}</Badge></div>
              <div className="ad-card__body ad-form" style={{ marginTop: 0 }}>
                <p className="ad-stat__note" style={{ margin: 0 }}>{group.hint}</p>
                <div className="ad-settings__grid">
                  {group.fields.map((field) => (
                    <div className="ad-field" key={field.key}>
                      <label htmlFor={field.key}>{field.label}</label>
                      {"options" in field && field.options
                        ? <select id={field.key} name={field.key} defaultValue={values[field.key] || field.options[0].value}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                        : "secret" in field && field.secret
                          ? <input id={field.key} name={field.key} type="password" autoComplete="off" placeholder={values[field.key] ? `Αποθηκευμένο: ${mask(values[field.key])}` : "Δεν έχει οριστεί"} />
                          : <input id={field.key} name={field.key} autoComplete="off" defaultValue={values[field.key]} placeholder={"placeholder" in field ? field.placeholder : undefined} pattern={"pattern" in field ? field.pattern : undefined} />}
                      {"secret" in field && field.secret && values[field.key] ? <label className="ad-inline"><input type="checkbox" name={`clear:${field.key}`} />Διαγραφή του αποθηκευμένου κλειδιού</label> : null}
                      {"secret" in field && field.secret ? <small>Αφήστε το κενό για να μείνει όπως είναι.</small> : null}
                    </div>
                  ))}
                </div>
                {group.group === "Viva Payments" ? (
                  <p className="ad-stat__note" style={{ margin: 0 }}>Στη Viva ορίστε: Success URL <code>{app}/api/viva/return</code>, Failure URL <code>{app}/api/viva/return?failed=1</code>, Webhook <code>{app}/api/viva/webhook</code>.</p>
                ) : null}
                {group.group === "Mailgun" ? <p className="ad-stat__note" style={{ margin: 0 }}>Δείτε πώς φαίνονται τα μηνύματα στις <Link href="/admin/emails">Προεπισκοπήσεις email</Link>.</p> : null}
                {group.group === "OpenRouter (AI)" ? <p className="ad-stat__note" style={{ margin: 0 }}>Το όνομα του μοντέλου γράφεται όπως στο openrouter.ai/models. Δοκιμάστε το από τα <Link href="/admin/content">Άρθρα</Link>, «Νέο άρθρο».</p> : null}
                {group.group === "Bunny CDN" ? <p className="ad-stat__note" style={{ margin: 0 }}>Μετά τη ρύθμιση, ανεβάστε αρχεία από τη <Link href="/admin/media">Βιβλιοθήκη μέσων</Link>.</p> : null}
              </div>
            </section>
          );
        })}
        <div className="ad-form__foot"><Button variant="primary" size="lg" type="submit">Αποθήκευση ρυθμίσεων</Button></div>
      </form>
    </>
  );
}
