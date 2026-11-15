import { Sparkles } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { locales } from "@/lib/i18n";
import { Button } from "@/components/dg/button";
import { FormModal, RowMenu } from "@/components/admin/client";
import { Alert, PageHead, Status, stamp } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteArticle, generateContent, setArticleStatus, updateArticle } from "../../actions";

export const metadata = { title: "Περιεχόμενο" };
export const maxDuration = 300;

const LANG = { el: "Ελληνικά", en: "English", de: "Deutsch" } as const;

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const user = await requirePermission("content.read");
  const query = await searchParams;
  const articles = await db.article.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { translations: true } });
  const write = can(user.role, "content.write");
  const ready = await aiConfigured();
  return (
    <>
      <PageHead title="Περιεχόμενο" text="Άρθρα για την Κόρινθο και την ευρύτερη περιοχή. Γράφονται αυτόματα σε ελληνικά, αγγλικά και γερμανικά και εμφανίζονται στο «Γνωρίστε την Κόρινθο» μόλις τα δημοσιεύσετε.">
        {write ? (
          <FormModal trigger={<><Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />Νέο άρθρο</>} title="Νέο άρθρο με AI" description="Το άρθρο γράφεται και στις τρεις γλώσσες. Χρειάζεται περίπου ένα λεπτό. Θα το βρείτε στη λίστα ως πρόχειρο.">
            <form className="ad-form" action={generateContent}>
              <div className="ad-field">
                <label htmlFor="topic">Θέμα (προαιρετικό)</label>
                <input id="topic" name="topic" placeholder="π.χ. Η Διώρυγα της Κορίνθου" maxLength={200} />
                <small>Αφήστε το κενό και το σύστημα διαλέγει το επόμενο θέμα που δεν έχει γραφτεί.</small>
              </div>
              <div className="ad-form__foot"><Button variant="primary" type="submit" disabled={!ready}>Δημιουργία</Button></div>
            </form>
          </FormModal>
        ) : null}
      </PageHead>

      {!ready ? <Alert bad>Η αυτόματη συγγραφή δεν είναι ρυθμισμένη. Συμπληρώστε API key και μοντέλο του OpenRouter στις Ρυθμίσεις.</Alert> : null}
      {query.ok === "generated" ? <Alert>Το άρθρο γράφτηκε. Διαβάστε το και δημοσιεύστε το από το μενού της γραμμής.</Alert> : null}
      {query.ok === "saved" ? <Alert>Οι αλλαγές αποθηκεύτηκαν.</Alert> : null}
      {typeof query.error === "string" ? <Alert bad>Δεν ολοκληρώθηκε: {query.error}</Alert> : null}

      <section className="ad-card">
        {articles.length === 0 ? <p className="ad-empty">Δεν υπάρχει άρθρο ακόμη. Πατήστε «Νέο άρθρο» για το πρώτο.</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Τίτλος</TableHead><TableHead>Κατάσταση</TableHead><TableHead className="ad-hide">Γράφτηκε</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {articles.map((article) => {
                const text = Object.fromEntries(article.translations.map((row) => [row.locale, row]));
                const published = article.status === "PUBLISHED";
                return (
                  <TableRow key={article.id}>
                    <TableCell style={{ whiteSpace: "normal" }}><strong>{text.el?.title ?? article.slug}</strong><br /><span className="ad-stat__note">{text.en?.title}</span></TableCell>
                    <TableCell><Status value={article.status} /></TableCell>
                    <TableCell className="ad-hide">{stamp(article.createdAt)}<br /><span className="ad-stat__note">{article.model}</span></TableCell>
                    <TableCell style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <FormModal wide variant="ghost" trigger={write ? "Επεξεργασία" : "Προβολή"} title={text.el?.title ?? article.slug} description="Διορθώστε ό,τι χρειάζεται σε κάθε γλώσσα. Το κείμενο δέχεται παραγράφους και υπότιτλους που αρχίζουν με ##.">
                          <form className="ad-form" action={updateArticle.bind(null, article.id)}>
                            {locales.map((locale, index) => (
                              <details className="ad-lang" key={locale} open={index === 0}>
                                <summary>{LANG[locale]}</summary>
                                <div className="ad-form">
                                  <div className="ad-field"><label htmlFor={`${article.id}-${locale}-title`}>Τίτλος</label><input id={`${article.id}-${locale}-title`} name={`${locale}.title`} defaultValue={text[locale]?.title} lang={locale} required /></div>
                                  <div className="ad-field"><label htmlFor={`${article.id}-${locale}-excerpt`}>Περίληψη</label><textarea id={`${article.id}-${locale}-excerpt`} name={`${locale}.excerpt`} defaultValue={text[locale]?.excerpt} lang={locale} required /></div>
                                  <div className="ad-field"><label htmlFor={`${article.id}-${locale}-body`}>Κείμενο</label><textarea id={`${article.id}-${locale}-body`} name={`${locale}.body`} defaultValue={text[locale]?.body} lang={locale} rows={14} required /></div>
                                  <div className="ad-field"><label htmlFor={`${article.id}-${locale}-mt`}>Τίτλος για Google</label><input id={`${article.id}-${locale}-mt`} name={`${locale}.metaTitle`} defaultValue={text[locale]?.metaTitle} lang={locale} required /></div>
                                  <div className="ad-field"><label htmlFor={`${article.id}-${locale}-md`}>Περιγραφή για Google</label><textarea id={`${article.id}-${locale}-md`} name={`${locale}.metaDescription`} defaultValue={text[locale]?.metaDescription} lang={locale} required /></div>
                                </div>
                              </details>
                            ))}
                            {write ? <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div> : null}
                          </form>
                        </FormModal>
                        {write ? (
                          <RowMenu label={`Ενέργειες για ${article.slug}`} actions={[
                            { label: published ? "Απόσυρση από το site" : "Δημοσίευση στο site", action: setArticleStatus.bind(null, article.id, published ? "DRAFT" : "PUBLISHED") },
                            { label: "Διαγραφή", action: deleteArticle.bind(null, article.id), danger: true, confirm: "Το άρθρο θα διαγραφεί και στις τρεις γλώσσες. Δεν αναιρείται. Συνέχεια;" },
                          ]} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
