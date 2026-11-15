import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Mail, MessageSquare, Pencil, Phone, StickyNote, Wrench } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal } from "@/components/admin/client";
import { GuestForm } from "@/components/admin/forms";
import { Alert, PageHead, Status, day, eur, stamp } from "@/components/admin/parts";
import { addActivity, saveGuest } from "../../../ops-actions";

export const metadata = { title: "Καρτέλα πελάτη" };

const LANG = { el: "Ελληνικά", en: "Αγγλικά", de: "Γερμανικά" } as Record<string, string>;
const ACT = { NOTE: { label: "Σημείωση", Icon: StickyNote }, CALL: { label: "Τηλεφώνημα", Icon: Phone }, EMAIL: { label: "Email", Icon: Mail } } as const;

export default async function GuestPage({ params, searchParams }: PageProps<"/admin/guests/[id]">) {
  const user = await requirePermission("crm.read");
  const { id } = await params;
  const query = await searchParams;
  const guest = await db.guest.findUnique({ where: { id }, include: {
    reservations: { orderBy: { checkIn: "desc" }, include: { units: { include: { unit: true } } } },
    inquiries: { orderBy: { createdAt: "desc" } }, activities: { orderBy: { createdAt: "desc" }, include: { user: true } }, tickets: { orderBy: { createdAt: "desc" } },
  } });
  if (!guest) notFound();
  const write = can(user.role, "crm.write");
  const stays = guest.reservations.filter((row) => row.status === "CONFIRMED");
  const spent = stays.reduce((sum, row) => sum + row.totalCents, 0);
  const upcoming = stays.filter((row) => row.checkIn > new Date()).sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime())[0];

  // One timeline of everything that happened with this guest, newest first.
  const timeline = [
    ...guest.reservations.map((row) => ({ at: row.createdAt, Icon: CalendarCheck, title: `Κράτηση ${row.code}`, text: `${day(row.checkIn)} έως ${day(row.checkOut)} · ${eur(row.totalCents)}`, href: `/admin/reservations/${row.id}`, badge: <Status value={row.status === "PENDING" && (!row.holdExpiresAt || row.holdExpiresAt <= new Date()) ? "EXPIRED" : row.status} /> })),
    ...guest.inquiries.map((row) => ({ at: row.createdAt, Icon: MessageSquare, title: "Μήνυμα από τη φόρμα επικοινωνίας", text: row.message, href: "/admin/messages", badge: <Badge variant={row.handled ? "success" : "warning"}>{row.handled ? "Απαντήθηκε" : "Περιμένει απάντηση"}</Badge> })),
    ...guest.tickets.map((row) => ({ at: row.createdAt, Icon: Wrench, title: row.title, text: row.description ?? "", href: `/admin/ops?type=${row.type === "CLEANING" || row.type === "GUEST_REQUEST" ? row.type : "ISSUES"}`, badge: <Status value={row.status} /> })),
    ...guest.activities.map((row) => ({ at: row.createdAt, Icon: ACT[row.type].Icon, title: `${ACT[row.type].label}${row.user ? ` · ${row.user.name}` : ""}`, text: row.text, href: undefined, badge: null })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <p style={{ marginBottom: 12 }}><Link href="/admin/guests" className="ad-back"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />Όλοι οι πελάτες</Link></p>
      <PageHead title={guest.name} text={`${guest.email}${guest.phone ? ` · ${guest.phone}` : ""} · ${LANG[guest.language] ?? guest.language}${guest.country ? ` · ${guest.country}` : ""}`}>
        {guest.vip ? <Badge variant="purple">VIP</Badge> : null}
        {write ? <FormModal variant="secondary" trigger={<><Pencil size={16} strokeWidth={1.5} aria-hidden="true" />Επεξεργασία</>} title={guest.name}><GuestForm guest={guest} action={saveGuest.bind(null, guest.id)} /></FormModal> : null}
      </PageHead>
      {query.ok ? <Alert>Αποθηκεύτηκε.</Alert> : null}
      {query.error === "exists" ? <Alert bad>Αυτό το email ανήκει ήδη σε αυτή την καρτέλα. Δεν δημιουργήθηκε δεύτερη.</Alert> : query.error ? <Alert bad>Συμπληρώστε τα απαραίτητα πεδία.</Alert> : null}

      <section className="ad-stats" aria-label="Σύνοψη πελάτη">
        <div className="ad-card ad-stat"><span className="ad-stat__label">Διαμονές</span><span className="ad-stat__value">{stays.length}</span><span className="ad-stat__note">{stays.length > 1 ? "Επαναλαμβανόμενος πελάτης. Αξίζει προσωπική υποδοχή." : stays.length === 1 ? "Έχει έρθει μία φορά." : "Δεν έχει μείνει ακόμη."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Συνολική αξία</span><span className="ad-stat__value">{eur(spent)}</span><span className="ad-stat__note">Από επιβεβαιωμένες κρατήσεις.</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Επόμενη άφιξη</span><span className="ad-stat__value" style={{ fontSize: "var(--fs-20)" }}>{upcoming ? day(upcoming.checkIn) : "Καμία"}</span><span className="ad-stat__note">{upcoming ? <Link href={`/admin/reservations/${upcoming.id}`}>Άνοιγμα κράτησης</Link> : "Δεν έχει κλείσει επόμενη διαμονή."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Ενημερώσεις</span><span className="ad-stat__value" style={{ fontSize: "var(--fs-20)" }}>{guest.marketingConsent ? "Συμφωνεί" : "Όχι"}</span><span className="ad-stat__note">{guest.marketingConsent ? "Μπορείτε να του στέλνετε προσφορές." : "Μην του στέλνετε διαφημιστικά email."}</span></div>
      </section>

      <div className="ad-two">
        <section className="ad-card">
          <div className="ad-card__head"><h2>Ιστορικό</h2></div>
          {timeline.length === 0 ? <p className="ad-empty">Δεν υπάρχει ιστορικό ακόμη.</p> : (
            <ol className="ad-timeline">{timeline.map((item, index) => (
              <li key={index}>
                <span className="ad-timeline__icon"><item.Icon size={16} strokeWidth={1.5} aria-hidden="true" /></span>
                <div>
                  <p className="ad-timeline__head">{item.href ? <Link href={item.href}><strong>{item.title}</strong></Link> : <strong>{item.title}</strong>} {item.badge}</p>
                  {item.text ? <p className="ad-timeline__text">{item.text}</p> : null}
                  <p className="ad-stat__note">{stamp(item.at)}</p>
                </div>
              </li>
            ))}</ol>
          )}
        </section>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          {write ? (
            <section className="ad-card">
              <div className="ad-card__head"><h2>Νέα καταγραφή</h2></div>
              <form className="ad-form ad-card__body" action={addActivity.bind(null, guest.id)} style={{ marginTop: 0 }}>
                <div className="ad-field"><label htmlFor="act-type">Τι έγινε</label><select id="act-type" name="type" defaultValue="NOTE"><option value="NOTE">Σημείωση</option><option value="CALL">Τηλεφώνημα</option><option value="EMAIL">Email</option></select></div>
                <div className="ad-field"><label htmlFor="act-text">Περιγραφή</label><textarea id="act-text" name="text" required /></div>
                <div className="ad-form__foot"><Button variant="primary" type="submit">Καταγραφή</Button></div>
              </form>
            </section>
          ) : null}
          <section className="ad-card">
            <div className="ad-card__head"><h2>Προτιμήσεις και σημειώσεις</h2></div>
            <p className="ad-card__body" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{guest.notes || "Δεν έχει καταγραφεί κάτι. Προσθέστε το από την Επεξεργασία."}</p>
          </section>
        </div>
      </div>
    </>
  );
}
