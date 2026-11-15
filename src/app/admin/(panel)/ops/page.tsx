import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { dayString, parseDay } from "@/lib/booking";
import { Button } from "@/components/dg/button";
import { FormModal, RowMenu } from "@/components/admin/client";
import { TicketForm } from "@/components/admin/forms";
import { Alert, PageHead, Status, day, eur, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateCleaning, saveTicket, setTicketStatus } from "../../ops-actions";

const VIEWS = {
  CLEANING: { title: "Καθαριότητα", text: "Οι εργασίες καθαρισμού ανά ημέρα και βίλα. Δημιουργούνται αυτόματα από τις κρατήσεις: καθημερινός καθαρισμός, πετσέτες, κλινοσκεπάσματα ανά δύο ημέρες και καθαρισμός αναχώρησης.", types: ["CLEANING"], create: "CLEANING", empty: "Καμία εργασία καθαρισμού. Πατήστε «Πλάνο 7 ημερών» για να δημιουργηθούν από τις κρατήσεις." },
  GUEST_REQUEST: { title: "Αιτήματα πελατών", text: "Ό,τι ζήτησαν οι επισκέπτες, από το site ή από εσάς. Τα επείγοντα πάνω.", types: ["GUEST_REQUEST"], create: "GUEST_REQUEST", empty: "Κανένα αίτημα σε αναμονή." },
  ISSUES: { title: "Ζημιές και συντήρηση", text: "Βλάβες, φθορές και ζημιές, με το κόστος τους και αν χρεώνονται στον πελάτη.", types: ["DAMAGE", "MAINTENANCE"], create: "DAMAGE", empty: "Καμία ζημιά ή εργασία συντήρησης σε εκκρεμότητα." },
} as const;

export const metadata = { title: "Λειτουργίες" };

export default async function OpsPage({ searchParams }: PageProps<"/admin/ops">) {
  const user = await requirePermission("ops.read");
  const query = await searchParams;
  const key = (String(query.type) in VIEWS ? String(query.type) : "CLEANING") as keyof typeof VIEWS;
  const view = VIEWS[key];
  const show = query.show === "done" ? "done" : "open";
  const where: Prisma.TicketWhereInput = { type: { in: [...view.types] }, status: show === "done" ? { in: ["DONE", "CANCELLED"] } : { in: ["OPEN", "IN_PROGRESS"] } };
  const [tickets, units, staff, open, costs] = await Promise.all([
    db.ticket.findMany({ where, orderBy: show === "done" ? [{ doneAt: "desc" }] : [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "asc" }], take: 200, include: { unit: true, assignee: true, reservation: true } }),
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.ticket.count({ where: { type: { in: [...view.types] }, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    key === "ISSUES" ? db.ticket.aggregate({ where: { type: { in: ["DAMAGE", "MAINTENANCE"] }, status: { not: "CANCELLED" } }, _sum: { costCents: true } }) : null,
  ]);
  const write = can(user.role, "ops.write");
  const today = parseDay(dayString(new Date()))!;
  const overdue = show === "open" ? tickets.filter((row) => row.dueDate && row.dueDate < today).length : 0;
  const back = `/admin/ops?type=${key}`;

  return (
    <>
      <PageHead title={view.title} text={view.text}>
        {write && key === "CLEANING" ? <form action={generateCleaning}><Button variant="secondary" type="submit"><Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />Πλάνο 7 ημερών</Button></form> : null}
        {write ? <FormModal trigger={<><Plus size={16} strokeWidth={1.5} aria-hidden="true" />Νέα εγγραφή</>} title={`Νέα εγγραφή: ${view.title}`}><TicketForm defaultType={view.create} units={units} staff={staff} action={saveTicket.bind(null, null, back)} /></FormModal> : null}
      </PageHead>
      {query.ok === "generated" ? <Alert>{Number(query.n) ? `Δημιουργήθηκαν ${Number(query.n)} νέες εργασίες καθαρισμού για τις επόμενες 7 ημέρες.` : "Το πλάνο ήταν ήδη πλήρες. Δεν χρειάστηκε νέα εργασία."}</Alert> : query.ok ? <Alert>Αποθηκεύτηκε.</Alert> : null}
      {query.error ? <Alert bad>Δώστε τουλάχιστον τίτλο.</Alert> : null}
      {overdue ? <Alert bad>{overdue} εγγραφές έχουν περάσει την προθεσμία τους. Ξεκινήστε από αυτές.</Alert> : null}

      <nav className="ad-tabs" aria-label="Είδος εργασίας">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((id) => <Link key={id} href={`/admin/ops?type=${id}`} aria-current={id === key ? "page" : undefined}>{VIEWS[id].title}</Link>)}
      </nav>
      <nav className="ad-filters" aria-label="Εμφάνιση" style={{ marginBottom: 16 }}>
        <Link href={back} aria-current={show === "open" ? "true" : undefined}>Σε εκκρεμότητα ({open})</Link>
        <Link href={`${back}&show=done`} aria-current={show === "done" ? "true" : undefined}>Ολοκληρωμένα</Link>
        {costs ? <span className="ad-stat__note" style={{ alignSelf: "center", marginLeft: "auto" }}>Συνολικό κόστος ζημιών και συντήρησης: <strong>{eur(costs._sum.costCents ?? 0)}</strong></span> : null}
      </nav>

      <section className="ad-card">
        {tickets.length === 0 ? <p className="ad-empty">{show === "done" ? "Τίποτα ολοκληρωμένο ακόμη." : view.empty}</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Για πότε</TableHead><TableHead>Τι</TableHead><TableHead className="ad-hide">Βίλα</TableHead><TableHead className="ad-hide">Ανάθεση</TableHead>{key === "ISSUES" ? <TableHead>Κόστος</TableHead> : null}<TableHead>Κατάσταση</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
            <TableBody>{tickets.map((row) => {
              const late = show === "open" && row.dueDate && row.dueDate < today;
              return (
                <TableRow key={row.id}>
                  <TableCell className={late ? "ad-tone--bad" : undefined}>{row.dueDate ? <strong>{dayString(row.dueDate) === dayString(today) ? "Σήμερα" : day(row.dueDate)}</strong> : "Χωρίς προθεσμία"}{late ? <><br /><span>Εκπρόθεσμο</span></> : null}</TableCell>
                  <TableCell style={{ whiteSpace: "normal", minWidth: 220 }}><strong>{row.title}</strong>{row.priority === "HIGH" ? <> <Status value="HIGH" /></> : null}{key === "ISSUES" ? <> <Status value={row.type} /></> : null}{row.description ? <><br /><span className="ad-stat__note">{row.description}</span></> : null}{row.reservation ? <><br /><Link className="ad-stat__note" href={`/admin/reservations/${row.reservation.id}`}>Κράτηση {row.reservation.guestName}</Link></> : null}</TableCell>
                  <TableCell className="ad-hide">{row.unit ? unitLabel(row.unit.slug) : "Κτήμα"}</TableCell>
                  <TableCell className="ad-hide">{row.assignee?.name ?? "Κανείς"}</TableCell>
                  {key === "ISSUES" ? <TableCell>{row.costCents ? <>{eur(row.costCents)}{row.chargedToGuest ? <><br /><span className="ad-stat__note">στον πελάτη</span></> : null}</> : "-"}</TableCell> : null}
                  <TableCell><Status value={row.status} /></TableCell>
                  <TableCell style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {write ? (
                      <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        {row.status !== "DONE" && row.status !== "CANCELLED" ? <form action={setTicketStatus.bind(null, row.id, "DONE")}><Button variant="secondary" size="sm" type="submit">Έγινε</Button></form> : null}
                        <FormModal variant="ghost" trigger="Άνοιγμα" title={row.title}><TicketForm ticket={row} defaultType={row.type} units={units} staff={staff} action={saveTicket.bind(null, row.id, back)} /></FormModal>
                        <RowMenu label={`Ενέργειες για ${row.title}`} actions={[
                          ...(row.status === "OPEN" ? [{ label: "Ξεκίνησε", action: setTicketStatus.bind(null, row.id, "IN_PROGRESS") }] : []),
                          ...(row.status === "DONE" || row.status === "CANCELLED" ? [{ label: "Άνοιγμα ξανά", action: setTicketStatus.bind(null, row.id, "OPEN") }] : [{ label: "Ακύρωση", action: setTicketStatus.bind(null, row.id, "CANCELLED"), danger: true }]),
                        ]} />
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
