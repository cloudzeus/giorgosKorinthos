import Link from "next/link";
import { requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { baseDict, flatten, locales } from "@/lib/i18n";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { Alert, PageHead } from "@/components/admin/parts";
import { saveContent } from "../../ops-actions";

export const metadata = { title: "Κείμενα site" };

// The sections of the public site, in the order a visitor meets them.
const SECTIONS: Record<string, string> = {
  hero: "Αρχική: κεντρικός τίτλος", philosophy: "Αρχική: φιλοσοφία", mottos: "Mottos (κινούμενη λωρίδα)", brand: "Mottos και μικροί τίτλοι", facts: "Αριθμοί του κτήματος",
  rooms: "Οι βίλες: τίτλοι και παροχές", units: "Οι βίλες: περιγραφές", pool: "Η πισίνα", living: "Υπαίθρια ζωή", villa: "Σελίδα «Το κτήμα»", experiences: "Σελίδα «Εμπειρίες»",
  explore: "Γνωρίστε την Κόρινθο: τίτλοι", places: "Γνωρίστε την Κόρινθο: οι 12 προτάσεις", reserve: "Κάλεσμα για κράτηση", concierge: "Εξυπηρέτηση", gallery: "Φωτογραφίες", contact: "Επικοινωνία",
  booking: "Σελίδα κράτησης", stay: "Αιτήματα κατά τη διαμονή", mail: "Email προς πελάτες", cookie: "Μήνυμα cookies", footer: "Υποσέλιδο", nav: "Μενού", meta: "Τίτλος και περιγραφή για Google", bookbar: "Φόρμα ημερομηνιών", alt: "Περιγραφές φωτογραφιών",
};
const LANG = { el: "Ελληνικά", en: "English", de: "Deutsch" } as const;

// Field names in plain Greek. Anything not listed keeps its technical name.
const WORDS: Record<string, string> = {
  eyebrow: "Μικρός τίτλος πάνω από τον τίτλο", lines: "Τίτλος, γραμμή", lead: "Εισαγωγικό κείμενο", text: "Κείμενο", title: "Τίτλος", cta: "Κείμενο κουμπιού", quote: "Φράση", name: "Όνομα",
  summary: "Περιγραφή", duration: "Διάρκεια επίσκεψης", tip: "Η πρότασή μας", label: "Ετικέτα", value: "Τιμή", description: "Περιγραφή για Google", beds: "Σύνοψη υπνοδωματίων", rooms: "Υπνοδωμάτιο",
  steps: "Βήμα", sections: "Ενότητα", groups: "Ομάδα", items: "Στοιχείο", included: "Παροχή", stops: "Στάση", time: "Ώρα", scroll: "Προτροπή για κύλιση", greeting: "Χαιρετισμός", signoff: "Κλείσιμο", team: "Υπογραφή",
  footer: "Υποσέλιδο", help: "Γραμμή βοήθειας", errors: "Μήνυμα σφάλματος", confirm: "Επιβεβαίωση", itinerary: "Διαδρομή", categories: "Κατηγορία", kinds: "Είδος", cats: "Κατηγορία",
};
const human = (key: string) => key.split(".").slice(1).map((part) => (/^\d+$/.test(part) ? String(Number(part) + 1) : WORDS[part] ?? part)).join(" › ");

export default async function SitePage({ searchParams }: PageProps<"/admin/site">) {
  await requirePermission("cms.write");
  const query = await searchParams;
  const section = String(query.section) in SECTIONS ? String(query.section) : "hero";
  const overrides = await db.contentBlock.findMany({ where: { key: { startsWith: `${section}.` } } });
  const changed = await db.contentBlock.groupBy({ by: ["key"], _count: true });
  const changedSections = new Set(changed.map((row) => row.key.split(".")[0]));
  const stored = new Map(overrides.map((row) => [`${row.locale}|${row.key}`, row.value]));
  const base = Object.fromEntries(locales.map((locale) => [locale, flatten((baseDict(locale) as Record<string, unknown>)[section], section)]));
  const keys = Object.keys(base.el);

  return (
    <>
      <PageHead title="Κείμενα site" text="Αλλάξτε οποιοδήποτε κείμενο του site και στις τρεις γλώσσες. Η αλλαγή φαίνεται αμέσως. Για να επιστρέψετε στο αρχικό κείμενο, σβήστε το πεδίο και αποθηκεύστε." />
      {query.ok ? <Alert>Τα κείμενα αποθηκεύτηκαν και το site ενημερώθηκε.</Alert> : null}
      <div className="ad-cms">
        <nav className="ad-cms__nav" aria-label="Ενότητες">
          {Object.entries(SECTIONS).map(([id, label]) => (
            <Link key={id} href={`/admin/site?section=${id}`} aria-current={id === section ? "true" : undefined}>{label}{changedSections.has(id) ? <span className="ad-dot" aria-label="έχει αλλαγές" /> : null}</Link>
          ))}
        </nav>
        <form className="ad-card ad-cms__form" action={saveContent.bind(null, section)}>
          <div className="ad-card__head"><h2>{SECTIONS[section]}</h2><Button variant="primary" type="submit">Αποθήκευση</Button></div>
          <div className="ad-card__body ad-form" style={{ marginTop: 0 }}>
            {keys.map((key) => {
              const long = base.el[key].length > 70;
              return (
                <fieldset key={key} className="ad-cms__field">
                  <legend>{human(key) || SECTIONS[section]} {locales.some((locale) => stored.has(`${locale}|${key}`)) ? <Badge variant="info">Αλλαγμένο</Badge> : null}</legend>
                  {locales.map((locale) => (
                    <div className="ad-field" key={locale}>
                      <label htmlFor={`${locale}-${key}`}>{LANG[locale]}</label>
                      {long
                        ? <textarea id={`${locale}-${key}`} name={`${locale}|${key}`} lang={locale} rows={3} defaultValue={stored.get(`${locale}|${key}`) ?? base[locale][key]} />
                        : <input id={`${locale}-${key}`} name={`${locale}|${key}`} lang={locale} defaultValue={stored.get(`${locale}|${key}`) ?? base[locale][key]} />}
                    </div>
                  ))}
                </fieldset>
              );
            })}
            <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
          </div>
        </form>
      </div>
    </>
  );
}
