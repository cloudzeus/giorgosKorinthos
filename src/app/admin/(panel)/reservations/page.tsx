import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { dayString, nightsBetween } from "@/lib/booking";
import { Button } from "@/components/dg/button";
import { FormModal, RowMenu } from "@/components/admin/client";
import { Alert, PageHead, SortHead, Status, day, eur, stamp, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createManualReservation, setReservationStatus } from "../../actions";

export const metadata = { title: "Κρατήσεις" };

const FILTERS = [
  { id: "active", label: "Ενεργές" },
  { id: "CONFIRMED", label: "Επιβεβαιωμένες" },
  { id: "PENDING", label: "Σε αναμονή πληρωμής" },
  { id: "BLOCKED", label: "Κλειστές ημερομηνίες" },
  { id: "CANCELLED", label: "Ακυρωμένες" },
] as const;
const SORTS = { checkIn: "checkIn", guest: "guestName", total: "totalCents", created: "createdAt" } as const;

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const user = await requirePermission("reservations.read");
  const query = await searchParams;
  const filter = FILTERS.find((item) => item.id === query.status)?.id ?? "active";
  const sort = (String(query.sort) in SORTS ? String(query.sort) : "checkIn") as keyof typeof SORTS;
  const dir = query.dir === "desc" ? "desc" : "asc";
  const now = new Date();
  const where: Prisma.ReservationWhereInput =
    filter === "active" ? { OR: [{ status: { in: ["CONFIRMED", "BLOCKED"] } }, { status: "PENDING", holdExpiresAt: { gt: now } }], checkOut: { gte: new Date(`${dayString(now)}T00:00:00Z`) } }
    : { status: filter };
  const [rows, units] = await Promise.all([
    db.reservation.findMany({ where, orderBy: { [SORTS[sort]]: dir }, take: 200, include: { units: { include: { unit: true } } } }),
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
  ]);
  const write = can(user.role, "reservations.write");
  const base = `/admin/reservations?status=${filter}`;

  return (
    <>
      <PageHead title="Κρατήσεις" text="Όλες οι κρατήσεις από το site και όσες καταχωρίσατε εσείς. Οι πληρωμένες επιβεβαιώνονται αυτόματα από τη Viva.">
        {write ? (
          <FormModal trigger={<><Plus size={16} strokeWidth={1.5} aria-hidden="true" />Νέα καταχώριση</>} title="Νέα καταχώριση" description="Κράτηση από τηλέφωνο ή άλλο κανάλι, ή κλείσιμο ημερομηνιών. Οι ημερομηνίες δεσμεύονται αμέσως στο site.">
            <form className="ad-form" action={createManualReservation}>
              <div className="ad-field">
                <label htmlFor="m-kind">Τι καταχωρίζετε</label>
                <select id="m-kind" name="kind" defaultValue="CONFIRMED"><option value="CONFIRMED">Κράτηση επισκέπτη</option><option value="BLOCKED">Κλειστές ημερομηνίες (χωρίς επισκέπτη)</option></select>
              </div>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="m-in">Άφιξη</label><input id="m-in" name="in" type="date" required /></div>
                <div className="ad-field"><label htmlFor="m-out">Αναχώρηση</label><input id="m-out" name="out" type="date" required /></div>
              </div>
              <fieldset className="ad-checks">
                <legend>Βίλα</legend>
                {units.map((unit) => <label key={unit.id}><input type="checkbox" name="unit" value={unit.id} />{unitLabel(unit.slug)}</label>)}
              </fieldset>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="m-name">Ονοματεπώνυμο</label><input id="m-name" name="guestName" autoComplete="off" /></div>
                <div className="ad-field"><label htmlFor="m-phone">Τηλέφωνο</label><input id="m-phone" name="guestPhone" type="tel" autoComplete="off" /></div>
              </div>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="m-email">Email</label><input id="m-email" name="guestEmail" type="email" autoComplete="off" /></div>
                <div className="ad-field"><label htmlFor="m-adults">Άτομα</label><input id="m-adults" name="adults" type="number" min={1} max={11} defaultValue={2} /></div>
              </div>
              <div className="ad-field"><label htmlFor="m-notes">Σημειώσεις</label><textarea id="m-notes" name="notes" /></div>
              <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
            </form>
          </FormModal>
        ) : null}
      </PageHead>

      {query.ok ? <Alert>Η καταχώριση αποθηκεύτηκε και οι ημερομηνίες δεσμεύτηκαν.</Alert> : null}
      {query.error === "taken" ? <Alert bad>Κάποια βίλα είναι ήδη κλεισμένη για αυτές τις ημερομηνίες. Δεν αποθηκεύτηκε τίποτα.</Alert> : null}
      {query.error === "form" ? <Alert bad>Συμπληρώστε άφιξη, αναχώρηση μετά την άφιξη και τουλάχιστον μία βίλα.</Alert> : null}

      <nav className="ad-filters" aria-label="Φίλτρο κατάστασης" style={{ marginBottom: 16 }}>
        {FILTERS.map((item) => <Link key={item.id} href={`/admin/reservations?status=${item.id}`} aria-current={item.id === filter ? "true" : undefined}>{item.label}</Link>)}
      </nav>

      <section className="ad-card">
        {rows.length === 0 ? <p className="ad-empty">Δεν υπάρχει κράτηση σε αυτή την κατηγορία.</p> : (
          <Table className="ad-table">
            <TableHeader>
              <TableRow>
                <TableHead><SortHead field="checkIn" label="Διαμονή" sort={sort} dir={dir} base={base} /></TableHead>
                <TableHead><SortHead field="guest" label="Επισκέπτης" sort={sort} dir={dir} base={base} /></TableHead>
                <TableHead className="ad-hide">Βίλα</TableHead>
                <TableHead><SortHead field="total" label="Σύνολο" sort={sort} dir={dir} base={base} /></TableHead>
                <TableHead>Κατάσταση</TableHead>
                <TableHead className="ad-hide"><SortHead field="created" label="Καταχωρίστηκε" sort={sort} dir={dir} base={base} /></TableHead>
                <TableHead><span className="sr-only">Ενέργειες</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const expired = row.status === "PENDING" && (!row.holdExpiresAt || row.holdExpiresAt <= now);
                return (
                  <TableRow key={row.id}>
                    <TableCell><strong>{day(row.checkIn)}</strong><br /><span className="ad-stat__note">έως {day(row.checkOut)} · {nightsBetween(row.checkIn, row.checkOut)} βρ.</span></TableCell>
                    <TableCell><Link href={`/admin/reservations/${row.id}`}><strong>{row.guestName}</strong></Link><br /><span className="ad-stat__note">{[row.guestEmail, row.guestPhone].filter(Boolean).join(" · ") || row.code}</span></TableCell>
                    <TableCell className="ad-hide">{row.units.map((item) => unitLabel(item.unit.slug)).join(", ")}</TableCell>
                    <TableCell>{row.status === "BLOCKED" ? "-" : <>{eur(row.totalCents)}{row.dueCents < row.totalCents && row.status === "CONFIRMED" ? <><br /><span className="ad-stat__note">υπόλοιπο {eur(row.totalCents - row.dueCents)}</span></> : null}</>}</TableCell>
                    <TableCell><Status value={expired ? "EXPIRED" : row.status} /></TableCell>
                    <TableCell className="ad-hide">{stamp(row.createdAt)}<br /><span className="ad-stat__note">{row.source === "WEB" ? "Από το site" : "Χειροκίνητα"} · {row.code}</span></TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      {write ? (
                        <RowMenu label={`Ενέργειες για ${row.code}`} actions={[
                          ...(row.status === "PENDING" ? [{ label: "Επιβεβαίωση χωρίς online πληρωμή", action: setReservationStatus.bind(null, row.id, "CONFIRMED"), confirm: "Η κράτηση θα επιβεβαιωθεί χωρίς να έχει πληρωθεί online. Συνέχεια;" }] : []),
                          ...(row.status !== "CANCELLED" ? [{ label: row.status === "BLOCKED" ? "Άνοιγμα ημερομηνιών" : "Ακύρωση κράτησης", action: setReservationStatus.bind(null, row.id, "CANCELLED"), danger: true, confirm: "Οι ημερομηνίες θα ελευθερωθούν στο site. Η επιστροφή χρημάτων γίνεται από τη Viva. Συνέχεια;" }] : []),
                        ]} />
                      ) : null}
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
