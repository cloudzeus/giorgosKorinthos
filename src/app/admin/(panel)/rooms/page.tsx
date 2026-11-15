import { Pencil } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal } from "@/components/admin/client";
import { Alert, PageHead, eur, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateUnit } from "../../actions";

export const metadata = { title: "Δωμάτια και τιμές" };

export default async function RoomsPage({ searchParams }: PageProps<"/admin/rooms">) {
  const user = await requirePermission("reservations.read");
  const query = await searchParams;
  const units = await db.unit.findMany({ orderBy: { sort: "asc" } });
  const write = can(user.role, "rooms.write");
  return (
    <>
      <PageHead title="Δωμάτια και τιμές" text="Η τιμή ανά βραδιά που βλέπει ο επισκέπτης και χρεώνεται στην κράτηση. Οι αλλαγές ισχύουν αμέσως για νέες κρατήσεις." />
      {query.ok ? <Alert>Το δωμάτιο ενημερώθηκε.</Alert> : null}
      {query.error ? <Alert bad>Η τιμή πρέπει να είναι θετικός αριθμός και η χωρητικότητα από 1 έως 20.</Alert> : null}
      <section className="ad-card">
        <Table className="ad-table">
          <TableHeader><TableRow><TableHead>Δωμάτιο</TableHead><TableHead className="ad-hide">Κτίριο</TableHead><TableHead>Άτομα</TableHead><TableHead>Τιμή ανά βραδιά</TableHead><TableHead>Στο site</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell><strong>{unitLabel(unit.slug)}</strong></TableCell>
                <TableCell className="ad-hide">Κτίριο {unit.building === "A" ? "Α" : "Β"}</TableCell>
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
    </>
  );
}
