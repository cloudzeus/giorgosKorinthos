import { Pencil } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal } from "@/components/admin/client";
import { Alert, PageHead, eur, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateUnit } from "../../actions";
import { deleteRate, saveRate } from "../../ops-actions";
import { RowMenu } from "@/components/admin/client";
import { day } from "@/components/admin/parts";
import { Plus } from "lucide-react";

export const metadata = { title: "Βίλες και τιμές" };

export default async function RoomsPage({ searchParams }: PageProps<"/admin/rooms">) {
  const user = await requirePermission("reservations.read");
  const query = await searchParams;
  const units = (await db.unit.findMany({ orderBy: { sort: "asc" }, include: { rates: { orderBy: { from: "asc" } } } })).filter((unit) => unit.active || unit.rates.length);
  const write = can(user.role, "rooms.write");
  return (
    <>
      <PageHead title="Βίλες και τιμές" text="Η τιμή ανά βραδιά που βλέπει ο επισκέπτης και χρεώνεται στην κράτηση. Οι αλλαγές ισχύουν αμέσως για νέες κρατήσεις." />
      {query.ok === "rate" ? <Alert>Η εποχική τιμή αποθηκεύτηκε και ισχύει για νέες κρατήσεις.</Alert> : query.ok ? <Alert>Η βίλα ενημερώθηκε.</Alert> : null}
      {query.error === "rate" ? <Alert bad>Δώστε όνομα, ημερομηνίες (το «έως» όχι πριν το «από»), θετική τιμή και ελάχιστες βραδιές από 1 έως 30.</Alert> : null}
      {query.error ? <Alert bad>Η τιμή πρέπει να είναι θετικός αριθμός και η χωρητικότητα από 1 έως 20.</Alert> : null}
      <section className="ad-card">
        <Table className="ad-table">
          <TableHeader><TableRow><TableHead>Βίλα</TableHead><TableHead>Άτομα</TableHead><TableHead>Τιμή ανά βραδιά</TableHead><TableHead>Στο site</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell><strong>{unitLabel(unit.slug)}</strong></TableCell>
                
                <TableCell>{unit.capacity}</TableCell>
                <TableCell>{eur(unit.priceCents)}</TableCell>
                <TableCell><Badge variant={unit.active ? "success" : "neutral"}>{unit.active ? "Διαθέσιμο για κράτηση" : "Κρυφό"}</Badge></TableCell>
                <TableCell style={{ textAlign: "right" }}>
                  {write ? (
                    <FormModal variant="ghost" trigger={<><Pencil size={16} strokeWidth={1.5} aria-hidden="true" />Αλλαγή</>} title={unitLabel(unit.slug)} description="Η νέα τιμή ισχύει για τις επόμενες κρατήσεις. Οι υπάρχουσες κρατούν την τιμή τους.">
                      <form className="ad-form" action={updateUnit.bind(null, unit.id)}>
                        <div className="ad-form__row">
                          <div className="ad-field"><label htmlFor={`p-${unit.id}`}>Τιμή ανά βραδιά (€)</label><input id={`p-${unit.id}`} name="price" inputMode="decimal" defaultValue={(unit.priceCents / 100).toString()} required /></div>
                          <div className="ad-field"><label htmlFor={`c-${unit.id}`}>Χωρητικότητα (άτομα)</label><input id={`c-${unit.id}`} name="capacity" type="number" min={1} max={20} defaultValue={unit.capacity} required /></div>
                        </div>
                        <fieldset className="ad-checks"><label><input type="checkbox" name="active" defaultChecked={unit.active} />Εμφανίζεται στο site και δέχεται κρατήσεις</label></fieldset>
                        <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
                      </form>
                    </FormModal>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <h2 className="ad-h2">Εποχικές τιμές</h2>
      <p className="ad-stat__note" style={{ marginBottom: 16, maxWidth: "70ch" }}>Μέσα σε μια περίοδο η βραδιά κοστίζει την τιμή της περιόδου αντί για τη βασική. Αν δύο περίοδοι πέφτουν μαζί, ισχύει αυτή που ξεκινά αργότερα.</p>
      <div className="ad-two">
        {units.filter((unit) => unit.active).map((unit) => (
          <section className="ad-card" key={unit.id}>
            <div className="ad-card__head"><h2>{unitLabel(unit.slug)} · βασική {eur(unit.priceCents)}</h2>
              {write ? (
                <FormModal variant="secondary" trigger={<><Plus size={16} strokeWidth={1.5} aria-hidden="true" />Νέα περίοδος</>} title={`Νέα περίοδος: ${unitLabel(unit.slug)}`}>
                  <form className="ad-form" action={saveRate.bind(null, unit.id)}>
                    <div className="ad-field"><label htmlFor={`rn-${unit.id}`}>Όνομα περιόδου</label><input id={`rn-${unit.id}`} name="name" placeholder="π.χ. Υψηλή σεζόν" required /></div>
                    <div className="ad-form__row">
                      <div className="ad-field"><label htmlFor={`rf-${unit.id}`}>Από</label><input id={`rf-${unit.id}`} name="from" type="date" required /></div>
                      <div className="ad-field"><label htmlFor={`rt-${unit.id}`}>Έως και</label><input id={`rt-${unit.id}`} name="to" type="date" required /></div>
                    </div>
                    <div className="ad-form__row">
                      <div className="ad-field"><label htmlFor={`rp-${unit.id}`}>Τιμή ανά βραδιά (€)</label><input id={`rp-${unit.id}`} name="price" inputMode="decimal" required /></div>
                      <div className="ad-field"><label htmlFor={`rm-${unit.id}`}>Ελάχιστες βραδιές</label><input id={`rm-${unit.id}`} name="minNights" type="number" min={1} max={30} defaultValue={1} required /></div>
                    </div>
                    <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
                  </form>
                </FormModal>
              ) : null}
            </div>
            {unit.rates.length === 0 ? <p className="ad-empty">Καμία εποχική τιμή. Ισχύει παντού η βασική.</p> : (
              <Table className="ad-table">
                <TableHeader><TableRow><TableHead>Περίοδος</TableHead><TableHead>Τιμή</TableHead><TableHead>Ελάχ. βραδιές</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
                <TableBody>{unit.rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell><strong>{rate.name}</strong><br /><span className="ad-stat__note">{day(rate.from)} έως {day(rate.to)}</span></TableCell>
                    <TableCell>{eur(rate.priceCents)}<br /><span className={`ad-stat__note ${rate.priceCents >= unit.priceCents ? "ad-tone--good" : "ad-tone--warn"}`}>{rate.priceCents >= unit.priceCents ? "+" : ""}{Math.round(((rate.priceCents - unit.priceCents) / unit.priceCents) * 100)}% από τη βασική</span></TableCell>
                    <TableCell>{rate.minNights}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>{write ? <RowMenu label={`Ενέργειες για ${rate.name}`} actions={[{ label: "Διαγραφή περιόδου", action: deleteRate.bind(null, rate.id), danger: true, confirm: "Η περίοδος θα διαγραφεί και θα ισχύει ξανά η βασική τιμή. Συνέχεια;" }]} /> : null}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
