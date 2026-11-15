import Link from "next/link";
import { requirePermission } from "@/auth";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { bookingEmail, renderEmail, type EmailContent } from "@/lib/email";
import { fmt } from "@/lib/site";
import { PageHead } from "@/components/admin/parts";

export const metadata = { title: "Προεπισκοπήσεις email" };

const TEMPLATES = { confirm: "Επιβεβαίωση κράτησης", change: "Αλλαγή κράτησης", cancel: "Ακύρωση κράτησης", inquiry: "Απάντηση σε μήνυμα", request: "Απάντηση σε αίτημα διαμονής" } as const;
const LANG = { el: "Ελληνικά", en: "English", de: "Deutsch" } as const;

// A made-up reservation, only to show how the messages look.
const SAMPLE = {
  id: "sample", code: "EL-1A2B3C4D5E6F", status: "CONFIRMED" as const, source: "WEB" as const, checkIn: new Date("2027-06-12T00:00:00Z"), checkOut: new Date("2027-06-19T00:00:00Z"),
  adults: 4, children: 2, guestName: "Μαρία Παπαδοπούλου", guestEmail: "guest@example.com", guestPhone: null, notes: null, totalCents: 315000, dueCents: 94500,
  holdExpiresAt: null, vivaOrderCode: null, vivaTransactionId: null, consentAt: null, createdAt: new Date(), guestId: null, checkedInAt: null, checkedOutAt: null, internalNotes: null,
  units: [{ reservationId: "sample", unitId: "u", priceCents: 45000, unit: { id: "u", slug: "a", building: "A", sort: 1, capacity: 7, priceCents: 45000, active: true } }],
};

export default async function EmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  await requirePermission("dashboard.read");
  const query = await searchParams;
  const template = (String(query.t) in TEMPLATES ? String(query.t) : "confirm") as keyof typeof TEMPLATES;
  const locale: Locale = isLocale(String(query.l)) ? (String(query.l) as Locale) : "el";
  let subject: string, content: EmailContent;
  if (template === "inquiry" || template === "request") {
    const { t } = await getDict(locale);
    subject = fmt(t.mail[`${template}Subject`], { code: SAMPLE.code });
    content = { locale, t, name: SAMPLE.guestName, title: t.mail[`${template}Title`], intro: t.mail[`${template}Intro`], quote: { label: template === "inquiry" ? t.mail.yourMessage : t.mail.yourRequest, text: template === "inquiry" ? "Καλησπέρα, είναι διαθέσιμη η Βίλα Α την πρώτη εβδομάδα του Ιουλίου;" : "Θα θέλαμε δύο επιπλέον πετσέτες πισίνας και ένα baby cot." } };
  } else {
    ({ subject, content } = await bookingEmail(template, { ...SAMPLE, locale }, template === "cancel" ? 0 : 94500));
  }
  return (
    <>
      <PageHead title="Προεπισκοπήσεις email" text="Έτσι φτάνουν τα μηνύματα στους πελάτες, με την ίδια εικόνα με το site. Τα κείμενά τους αλλάζουν από τα «Κείμενα site», ενότητα «Email προς πελάτες»." />
      <nav className="ad-filters" aria-label="Πρότυπο" style={{ marginBottom: 12 }}>
        {Object.entries(TEMPLATES).map(([id, label]) => <Link key={id} href={`/admin/emails?t=${id}&l=${locale}`} aria-current={id === template ? "true" : undefined}>{label}</Link>)}
      </nav>
      <nav className="ad-filters" aria-label="Γλώσσα" style={{ marginBottom: 16 }}>
        {Object.entries(LANG).map(([id, label]) => <Link key={id} href={`/admin/emails?t=${template}&l=${id}`} aria-current={id === locale ? "true" : undefined}>{label}</Link>)}
      </nav>
      <section className="ad-card">
        <div className="ad-card__head"><h2>Θέμα: {subject}</h2></div>
        <iframe className="ad-mail" title={`Προεπισκόπηση: ${TEMPLATES[template]}`} srcDoc={renderEmail(content)} sandbox="allow-same-origin" />
      </section>
    </>
  );
}
