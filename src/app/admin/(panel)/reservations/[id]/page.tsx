import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CreditCard, LogIn, LogOut, Pencil, Send, Wrench } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { dayString, nightsBetween } from "@/lib/booking";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal, RowMenu } from "@/components/admin/client";
import { Alert, PageHead, Status, day, eur, stamp, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setReservationStatus } from "../../../actions";
import { addPayment, reschedule, resendConfirmation, saveTicket, setStay, updateReservation } from "../../../ops-actions";

export const metadata = { title: "Κράτηση" };

const METHOD = { VIVA: "Viva (online)", CASH: "Μετρητά", BANK: "Τραπεζική κατάθεση", POS: "Κάρτα σε POS" } as const;
const OK: Record<string, string> = { moved: "Οι ημερομηνίες άλλαξαν και η διαθεσιμότητα ενημερώθηκε.", saved: "Οι αλλαγές αποθηκεύτηκαν.", payment: "Η πληρωμή καταχωρίστηκε.", sent: "Το email επιβεβαίωσης στάλθηκε στον πελάτη." };
const ERR: Record<string, string> = { taken: "Η βίλα είναι ήδη κλεισμένη για αυτές τις ημερομηνίες. Δεν άλλαξε τίποτα.", dates: "Δώστε άφιξη, αναχώρηση μετά την άφιξη και τουλάχιστον μία βίλα.", form: "Ελέγξτε το όνομα, τα άτομα και το σύνολο.", payment: "Δώστε ποσό διαφορετικό από μηδέν και τρόπο πληρωμής.", mail: "Το email δεν στάλθηκε. Ελέγξτε τις ρυθμίσεις Mailgun και το email του πελάτη." };

export default async function ReservationPage({ params, searchParams }: PageProps<"/admin/reservations/[id]">) {
  const user = await requirePermission("reservations.read");
  const { id } = await params;
  const query = await searchParams;
  const [r, units] = await Promise.all([
    db.reservation.findUnique({ where: { id }, include: { units: { include: { unit: true } }, payments: { orderBy: { createdAt: "asc" } }, tickets: { orderBy: { createdAt: "desc" } }, guest: true, extras: true } }),
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
  ]);
  if (!r) notFound();
  const write = can(user.role, "reservations.write");
  const paid = r.payments.reduce((sum, row) => sum + row.amountCents, 0);
  const balance = r.totalCents - paid;
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const expired = r.status === "PENDING" && (!r.holdExpiresAt || r.holdExpiresAt <= new Date());
  const live = r.status === "CONFIRMED";
  const back = `/admin/reservations/${r.id}`;

  return (
    <>
      <p style={{ marginBottom: 12 }}><Link href="/admin/reservations" className="ad-back"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />Όλες οι κρατήσεις</Link></p>
      <PageHead title={`${r.guestName} · ${r.code}`} text={`${day(r.checkIn)} έως ${day(r.checkOut)} · ${nights} βραδιές · ${r.units.map((row) => unitLabel(row.unit.slug)).join(", ")}`}>
        <Status value={expired ? "EXPIRED" : r.status} />
        {write && live && !r.checkedInAt ? <form action={setStay.bind(null, r.id, "in")}><Button variant="primary" type="submit"><LogIn size={16} strokeWidth={1.5} aria-hidden="true" />Check-in</Button></form> : null}
        {write && live && r.checkedInAt && !r.checkedOutAt ? <form action={setStay.bind(null, r.id, "out")}><Button variant="primary" type="submit"><LogOut size={16} strokeWidth={1.5} aria-hidden="true" />Check-out</Button></form> : null}
        {write ? (
          <RowMenu label="Περισσότερες ενέργειες" actions={[
            ...(live && r.guestEmail ? [{ label: "Αποστολή email επιβεβαίωσης ξανά", action: resendConfirmation.bind(null, r.id) }] : []),
            ...(r.status === "PENDING" ? [{ label: "Επιβεβαίωση χωρίς online πληρωμή", action: setReservationStatus.bind(null, r.id, "CONFIRMED"), confirm: "Η κράτηση θα επιβεβαιωθεί χωρίς να έχει πληρωθεί online. Συνέχεια;" }] : []),
            ...(r.status !== "CANCELLED" ? [{ label: r.status === "BLOCKED" ? "Άνοιγμα ημερομηνιών" : "Ακύρωση κράτησης", action: setReservationStatus.bind(null, r.id, "CANCELLED"), danger: true, confirm: "Οι ημερομηνίες θα ελευθερωθούν και ο πελάτης θα λάβει email ακύρωσης. Η επιστροφή χρημάτων γίνεται από τη Viva. Συνέχεια;" }] : []),
          ]} />
        ) : null}
      </PageHead>
      {typeof query.ok === "string" && OK[query.ok] ? <Alert>{OK[query.ok]}</Alert> : null}
      {typeof query.error === "string" && ERR[query.error] ? <Alert bad>{ERR[query.error]}</Alert> : null}

      <section className="ad-stats" aria-label="Σύνοψη">
        <div className="ad-card ad-stat"><span className="ad-stat__label">Σύνολο διαμονής</span><span className="ad-stat__value">{eur(r.totalCents)}</span><span className="ad-stat__note">{nights ? `${eur(Math.round(r.totalCents / nights))} ανά βραδιά κατά μέσο όρο.` : ""}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Έχει πληρωθεί</span><span className="ad-stat__value ad-tone--good">{eur(paid)}</span><span className="ad-stat__note">{r.payments.length} καταχωρίσεις πληρωμής.</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Υπόλοιπο</span><span className={`ad-stat__value ad-tone--${balance > 0 ? "warn" : "good"}`}>{eur(balance)}</span><span className="ad-stat__note">{balance > 0 ? "Εισπράξτε το στην άφιξη και καταχωρίστε την πληρωμή." : balance < 0 ? "Έχει πληρωθεί παραπάνω. Χρειάζεται επιστροφή." : "Εξοφλημένη."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Διαμονή</span><span className="ad-stat__value" style={{ fontSize: "var(--fs-20)" }}>{r.checkedOutAt ? "Αναχώρησε" : r.checkedInAt ? "Στο κτήμα" : dayString(r.checkIn) <= dayString(new Date()) && live ? "Αναμένεται" : "Δεν έχει έρθει"}</span><span className="ad-stat__note">{r.checkedInAt ? `Check-in ${stamp(r.checkedInAt)}` : ""}{r.checkedOutAt ? ` · Check-out ${stamp(r.checkedOutAt)}` : ""}</span></div>
      </section>

      <div className="ad-two">
        <section className="ad-card">
          <div className="ad-card__head"><h2>Στοιχεία κράτησης</h2>
            {write ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FormModal variant="secondary" trigger={<><CalendarClock size={16} strokeWidth={1.5} aria-hidden="true" />Αλλαγή ημερομηνιών ή βίλας</>} title="Αλλαγή ημερομηνιών ή βίλας" description="Ελέγχεται η διαθεσιμότητα πριν αποθηκευτεί. Αν η βίλα είναι κλεισμένη, δεν αλλάζει τίποτα.">
                  <form className="ad-form" action={reschedule.bind(null, r.id)}>
                    <div className="ad-form__row">
                      <div className="ad-field"><label htmlFor="rs-in">Άφιξη</label><input id="rs-in" name="in" type="date" defaultValue={dayString(r.checkIn)} required /></div>
                      <div className="ad-field"><label htmlFor="rs-out">Αναχώρηση</label><input id="rs-out" name="out" type="date" defaultValue={dayString(r.checkOut)} required /></div>
                    </div>
                    <fieldset className="ad-checks"><legend>Βίλα</legend>{units.map((unit) => <label key={unit.id}><input type="checkbox" name="unit" value={unit.id} defaultChecked={r.units.some((row) => row.unitId === unit.id)} />{unitLabel(unit.slug)}</label>)}</fieldset>
                    <fieldset className="ad-checks">
                      <label><input type="checkbox" name="reprice" defaultChecked />Υπολογισμός νέου συνόλου με τις τιμές των νέων ημερομηνιών</label>
                      <label><input type="checkbox" name="notify" defaultChecked={Boolean(r.guestEmail)} />Αποστολή email αλλαγής στον πελάτη</label>
                    </fieldset>
                    <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
                  </form>
                </FormModal>
                <FormModal variant="secondary" trigger={<><Pencil size={16} strokeWidth={1.5} aria-hidden="true" />Επεξεργασία</>} title="Στοιχεία κράτησης">
                  <form className="ad-form" action={updateReservation.bind(null, r.id)}>
                    <div className="ad-field"><label htmlFor="ed-name">Ονοματεπώνυμο</label><input id="ed-name" name="guestName" defaultValue={r.guestName} required /></div>
                    <div className="ad-form__row">
                      <div className="ad-field"><label htmlFor="ed-email">Email</label><input id="ed-email" name="guestEmail" type="email" defaultValue={r.guestEmail} /></div>
                      <div className="ad-field"><label htmlFor="ed-phone">Τηλέφωνο</label><input id="ed-phone" name="guestPhone" type="tel" defaultValue={r.guestPhone ?? ""} /></div>
                    </div>
                    <div className="ad-form__row">
                      <div className="ad-field"><label htmlFor="ed-adults">Ενήλικες</label><input id="ed-adults" name="adults" type="number" min={1} max={11} defaultValue={r.adults} required /></div>
                      <div className="ad-field"><label htmlFor="ed-children">Παιδιά</label><input id="ed-children" name="children" type="number" min={0} max={10} defaultValue={r.children} required /></div>
                    </div>
                    <div className="ad-field"><label htmlFor="ed-total">Σύνολο διαμονής (€)</label><input id="ed-total" name="total" inputMode="decimal" defaultValue={(r.totalCents / 100).toString()} required /><small>Αλλάξτε το μόνο για έκπτωση ή ειδική συμφωνία.</small></div>
                    <div className="ad-field"><label htmlFor="ed-notes">Σημειώσεις πελάτη</label><textarea id="ed-notes" name="notes" defaultValue={r.notes ?? ""} /></div>
                    <div className="ad-field"><label htmlFor="ed-int">Εσωτερικές σημειώσεις</label><textarea id="ed-int" name="internalNotes" defaultValue={r.internalNotes ?? ""} /><small>Δεν τις βλέπει ο πελάτης.</small></div>
                    <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
                  </form>
                </FormModal>
              </div>
            ) : null}
          </div>
          <dl className="ad-dl">
            <div><dt>Πελάτης</dt><dd>{r.guest ? <Link href={`/admin/guests/${r.guest.id}`}>{r.guestName}</Link> : r.guestName}{r.guest?.vip ? <> <Badge variant="purple">VIP</Badge></> : null}</dd></div>
            <div><dt>Επικοινωνία</dt><dd>{r.guestEmail ? <a href={`mailto:${r.guestEmail}`}>{r.guestEmail}</a> : "-"}{r.guestPhone ? <><br /><a href={`tel:${r.guestPhone}`}>{r.guestPhone}</a></> : null}</dd></div>
            <div><dt>Άτομα</dt><dd>{r.adults} ενήλικες{r.children ? `, ${r.children} παιδιά` : ""}</dd></div>
            <div><dt>Έξτρα υπηρεσίες</dt><dd>{r.extras.length ? r.extras.map((row) => <span key={row.id} style={{ display: "block" }}>{row.name} · {eur(row.priceCents)}</span>) : "Καμία"}</dd></div>
            <div><dt>Προέλευση</dt><dd>{r.source === "WEB" ? "Online από το site" : "Καταχωρίστηκε χειροκίνητα"} · {stamp(r.createdAt)}</dd></div>
            <div><dt>Σημειώσεις πελάτη</dt><dd style={{ whiteSpace: "pre-wrap" }}>{r.notes || "-"}</dd></div>
            <div><dt>Εσωτερικές σημειώσεις</dt><dd style={{ whiteSpace: "pre-wrap" }}>{r.internalNotes || "-"}</dd></div>
          </dl>
        </section>

        <section className="ad-card">
          <div className="ad-card__head"><h2>Πληρωμές</h2>
            {write ? (
              <FormModal variant="secondary" trigger={<><CreditCard size={16} strokeWidth={1.5} aria-hidden="true" />Νέα πληρωμή</>} title="Καταχώριση πληρωμής" description={`Υπόλοιπο τώρα: ${eur(balance)}`}>
                <form className="ad-form" action={addPayment.bind(null, r.id)}>
                  <div className="ad-form__row">
                    <div className="ad-field"><label htmlFor="pay-amount">Ποσό (€)</label><input id="pay-amount" name="amount" inputMode="decimal" defaultValue={balance > 0 ? (balance / 100).toString() : ""} required /></div>
                    <div className="ad-field"><label htmlFor="pay-method">Τρόπος</label><select id="pay-method" name="method" defaultValue="CASH"><option value="CASH">Μετρητά</option><option value="POS">Κάρτα σε POS</option><option value="BANK">Τραπεζική κατάθεση</option></select></div>
                  </div>
                  <div className="ad-field"><label htmlFor="pay-note">Σημείωση</label><input id="pay-note" name="note" /></div>
                  <fieldset className="ad-checks"><label><input type="checkbox" name="refund" />Είναι επιστροφή χρημάτων προς τον πελάτη</label></fieldset>
                  <div className="ad-form__foot"><Button variant="primary" type="submit">Καταχώριση</Button></div>
                </form>
              </FormModal>
            ) : null}
          </div>
          {r.payments.length === 0 ? <p className="ad-empty">Καμία πληρωμή ακόμη.</p> : (
            <Table className="ad-table">
              <TableHeader><TableRow><TableHead>Ημερομηνία</TableHead><TableHead>Τρόπος</TableHead><TableHead style={{ textAlign: "right" }}>Ποσό</TableHead></TableRow></TableHeader>
              <TableBody>{r.payments.map((row) => (
                <TableRow key={row.id}><TableCell>{stamp(row.createdAt)}</TableCell><TableCell>{METHOD[row.method]}{row.note && row.method !== "VIVA" ? <><br /><span className="ad-stat__note">{row.note}</span></> : null}</TableCell><TableCell style={{ textAlign: "right" }} className={row.amountCents < 0 ? "ad-tone--bad" : undefined}>{row.amountCents < 0 ? "Επιστροφή " : ""}{eur(row.amountCents)}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          )}
        </section>
      </div>

      <section className="ad-card" style={{ marginTop: 24 }}>
        <div className="ad-card__head"><h2>Αιτήματα, καθαριότητα και ζημιές αυτής της κράτησης</h2>
          {can(user.role, "ops.write") ? (
            <FormModal variant="secondary" trigger={<><Wrench size={16} strokeWidth={1.5} aria-hidden="true" />Νέα εγγραφή</>} title="Νέα εγγραφή για αυτή την κράτηση">
              <form className="ad-form" action={saveTicket.bind(null, null, back)}>
                <input type="hidden" name="reservationId" value={r.id} /><input type="hidden" name="guestId" value={r.guestId ?? ""} /><input type="hidden" name="unitId" value={r.units[0]?.unitId ?? ""} />
                <div className="ad-field"><label htmlFor="tk-type">Είδος</label><select id="tk-type" name="type" defaultValue="GUEST_REQUEST"><option value="GUEST_REQUEST">Αίτημα πελάτη</option><option value="CLEANING">Καθαριότητα</option><option value="MAINTENANCE">Συντήρηση</option><option value="DAMAGE">Ζημιά</option></select></div>
                <div className="ad-field"><label htmlFor="tk-title">Τίτλος</label><input id="tk-title" name="title" required /></div>
                <div className="ad-field"><label htmlFor="tk-desc">Περιγραφή</label><textarea id="tk-desc" name="description" /></div>
                <div className="ad-form__row">
                  <div className="ad-field"><label htmlFor="tk-due">Προθεσμία</label><input id="tk-due" name="dueDate" type="date" /></div>
                  <div className="ad-field"><label htmlFor="tk-cost">Κόστος (€), αν υπάρχει</label><input id="tk-cost" name="cost" inputMode="decimal" /></div>
                </div>
                <fieldset className="ad-checks"><label><input type="checkbox" name="chargedToGuest" />Χρεώνεται στον πελάτη</label></fieldset>
                <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
              </form>
            </FormModal>
          ) : null}
        </div>
        {r.tickets.length === 0 ? <p className="ad-empty">Καμία εγγραφή για αυτή την κράτηση.</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Τι</TableHead><TableHead>Είδος</TableHead><TableHead>Κατάσταση</TableHead><TableHead style={{ textAlign: "right" }}>Κόστος</TableHead></TableRow></TableHeader>
            <TableBody>{r.tickets.map((row) => (
              <TableRow key={row.id}><TableCell style={{ whiteSpace: "normal" }}><strong>{row.title}</strong>{row.dueDate ? <><br /><span className="ad-stat__note">για {day(row.dueDate)}</span></> : null}</TableCell><TableCell><Status value={row.type} /></TableCell><TableCell><Status value={row.status} /></TableCell><TableCell style={{ textAlign: "right" }}>{row.costCents ? `${eur(row.costCents)}${row.chargedToGuest ? " (στον πελάτη)" : ""}` : "-"}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </section>
      <p style={{ marginTop: 16 }}><Send size={14} strokeWidth={1.5} aria-hidden="true" /> <span className="ad-stat__note">Τα email προς τον πελάτη στέλνονται με το πρότυπο του site. Δείτε τα στις <Link href="/admin/emails">Προεπισκοπήσεις email</Link>.</span></p>
    </>
  );
}
