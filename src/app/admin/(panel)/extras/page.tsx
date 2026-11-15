import { Plus } from "lucide-react";
import type { Extra, ExtraTranslation, MediaAsset, Unit } from "@prisma/client";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { locales } from "@/lib/i18n";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal, RowMenu } from "@/components/admin/client";
import { Alert, PageHead, eur, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteExtra, saveExtra } from "../../ops-actions";

export const metadata = { title: "Έξτρα υπηρεσίες" };

const LANG = { el: "Ελληνικά", en: "English", de: "Deutsch" } as const;
const PRICING = { PER_STAY: "ανά διαμονή", PER_NIGHT: "ανά βραδιά", PER_PERSON: "ανά άτομο" } as const;
type Row = Extra & { translations: ExtraTranslation[]; units: Unit[] };

function ExtraForm({ extra, units, images }: { extra?: Row; units: Unit[]; images: MediaAsset[] }) {
  const id = extra?.id ?? "new";
  const tr = (locale: string) => extra?.translations.find((row) => row.locale === locale);
  return (
    <form className="ad-form" action={saveExtra.bind(null, extra?.id ?? null)}>
      {locales.map((locale, index) => (
        <details className="ad-lang" key={locale} open={index === 0}>
          <summary>{LANG[locale]}{index === 0 ? " (υποχρεωτικά)" : ""}</summary>
          <div className="ad-form">
            <div className="ad-field"><label htmlFor={`${id}-${locale}-name`}>Όνομα υπηρεσίας</label><input id={`${id}-${locale}-name`} name={`${locale}.name`} lang={locale} defaultValue={tr(locale)?.name} required={index === 0} placeholder={index === 0 ? "π.χ. Μεταφορά από το αεροδρόμιο" : undefined} /></div>
            <div className="ad-field"><label htmlFor={`${id}-${locale}-desc`}>Περιγραφή</label><textarea id={`${id}-${locale}-desc`} name={`${locale}.description`} lang={locale} defaultValue={tr(locale)?.description} /></div>
          </div>
        </details>
      ))}
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`${id}-price`}>Τιμή (€)</label><input id={`${id}-price`} name="price" inputMode="decimal" defaultValue={extra ? (extra.priceCents / 100).toString() : ""} required /></div>
        <div className="ad-field"><label htmlFor={`${id}-pricing`}>Χρεώνεται</label><select id={`${id}-pricing`} name="pricing" defaultValue={extra?.pricing ?? "PER_STAY"}><option value="PER_STAY">Μία φορά ανά διαμονή</option><option value="PER_NIGHT">Ανά βραδιά</option><option value="PER_PERSON">Ανά άτομο</option></select></div>
      </div>
      <fieldset className="ad-checks"><legend>Σε ποιες βίλες προσφέρεται</legend>{units.map((unit) => <label key={unit.id}><input type="checkbox" name="unit" value={unit.id} defaultChecked={extra ? extra.units.some((row) => row.id === unit.id) : true} />{unitLabel(unit.slug)}</label>)}</fieldset>
      <fieldset className="ad-picks">
        <legend>Φωτογραφίες (προαιρετικά)</legend>
        {images.length === 0 ? <p className="ad-stat__note">Δεν υπάρχουν φωτογραφίες στη Βιβλιοθήκη μέσων. Ανεβάστε πρώτα εκεί.</p> : images.map((image) => (
          <label key={image.id} title={image.title}><input type="checkbox" name="photo" value={image.id} defaultChecked={extra?.photos.includes(image.url)} /><img src={image.url} alt={image.title} loading="lazy" /></label>
        ))}
      </fieldset>
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`${id}-sort`}>Σειρά εμφάνισης</label><input id={`${id}-sort`} name="sort" type="number" defaultValue={extra?.sort ?? 0} /><small>Μικρότερος αριθμός, πιο ψηλά.</small></div>
        <fieldset className="ad-checks" style={{ alignSelf: "end" }}><label><input type="checkbox" name="active" defaultChecked={extra?.active ?? true} />Διαθέσιμη για επιλογή στην κράτηση</label></fieldset>
      </div>
      <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
    </form>
  );
}

export default async function ExtrasPage({ searchParams }: PageProps<"/admin/extras">) {
  const user = await requirePermission("reservations.read");
  const query = await searchParams;
  const [extras, units, images] = await Promise.all([
    db.extra.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }], include: { translations: true, units: true, _count: { select: { bookings: true } } } }),
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.mediaAsset.findMany({ where: { kind: "IMAGE" }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  const write = can(user.role, "rooms.write");
  return (
    <>
      <PageHead title="Έξτρα υπηρεσίες" text="Προαιρετικές υπηρεσίες με χρέωση, όπως μεταφορά ή ιδιωτικός σεφ. Ο επισκέπτης τις βλέπει στη σελίδα της βίλας και τις επιλέγει στην κράτηση· το ποσό προστίθεται στο σύνολο.">
        {write ? <FormModal wide trigger={<><Plus size={16} strokeWidth={1.5} aria-hidden="true" />Νέα υπηρεσία</>} title="Νέα υπηρεσία"><ExtraForm units={units} images={images} /></FormModal> : null}
      </PageHead>
      {query.ok ? <Alert>Η υπηρεσία αποθηκεύτηκε και εμφανίζεται στο site.</Alert> : null}
      {query.error ? <Alert bad>Δώστε όνομα στα ελληνικά, τιμή (μηδέν ή παραπάνω) και τουλάχιστον μία βίλα.</Alert> : null}
      <section className="ad-card">
        {extras.length === 0 ? <p className="ad-empty">Δεν υπάρχει υπηρεσία ακόμη. Πατήστε «Νέα υπηρεσία» για την πρώτη, για παράδειγμα μεταφορά από το αεροδρόμιο.</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Υπηρεσία</TableHead><TableHead>Τιμή</TableHead><TableHead className="ad-hide">Βίλες</TableHead><TableHead className="ad-hide">Έχει επιλεγεί</TableHead><TableHead>Στο site</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
            <TableBody>{extras.map((extra) => {
              const el = extra.translations.find((row) => row.locale === "el") ?? extra.translations[0];
              return (
                <TableRow key={extra.id}>
                  <TableCell style={{ whiteSpace: "normal", minWidth: 240 }}>
                    <div className="ad-extra">
                      {extra.photos[0] ? <img src={extra.photos[0]} alt="" loading="lazy" /> : <span aria-hidden="true" />}
                      <div><strong>{el?.name}</strong>{el?.description ? <><br /><span className="ad-stat__note">{el.description.slice(0, 110)}{el.description.length > 110 ? "…" : ""}</span></> : null}</div>
                    </div>
                  </TableCell>
                  <TableCell>{eur(extra.priceCents)}<br /><span className="ad-stat__note">{PRICING[extra.pricing]}</span></TableCell>
                  <TableCell className="ad-hide">{extra.units.filter((unit) => unit.active).map((unit) => unitLabel(unit.slug)).join(", ") || "Καμία"}</TableCell>
                  <TableCell className="ad-hide">{extra._count.bookings} φορές</TableCell>
                  <TableCell><Badge variant={extra.active ? "success" : "neutral"}>{extra.active ? "Διαθέσιμη" : "Κρυφή"}</Badge></TableCell>
                  <TableCell style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {write ? (
                      <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        <FormModal wide variant="ghost" trigger="Επεξεργασία" title={el?.name ?? "Υπηρεσία"}><ExtraForm extra={extra} units={units} images={images} /></FormModal>
                        <RowMenu label={`Ενέργειες για ${el?.name}`} actions={[{ label: "Διαγραφή", action: deleteExtra.bind(null, extra.id), danger: true, confirm: "Η υπηρεσία θα φύγει από το site. Οι παλιές κρατήσεις κρατούν το ποσό της. Συνέχεια;" }]} />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
