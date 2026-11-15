import Link from "next/link";
import { BedDouble, Euro, FileText, Mail } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { dayString } from "@/lib/booking";
import { Alert, PageHead, Status, day, eur, unitLabel } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Επισκόπηση" };

const DAYS = 30;

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requirePermission("dashboard.read");
  const denied = Boolean((await searchParams).denied);
  const today = new Date(`${dayString(new Date())}T00:00:00Z`);
  const end = new Date(today.getTime() + DAYS * 86_400_000);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [units, stays, arrivals, month, drafts, inbox] = await Promise.all([
    db.unit.count({ where: { active: true } }),
    db.reservation.findMany({ where: { status: { in: ["CONFIRMED", "BLOCKED"] }, checkIn: { lt: end }, checkOut: { gt: today } }, select: { checkIn: true, checkOut: true, status: true, _count: { select: { units: true } } } }),
    db.reservation.findMany({ where: { status: "CONFIRMED", checkIn: { gte: today } }, orderBy: { checkIn: "asc" }, take: 6, include: { units: { include: { unit: true } } } }),
    db.reservation.aggregate({ where: { status: "CONFIRMED", createdAt: { gte: monthStart } }, _sum: { totalCents: true }, _count: true }),
    db.article.count({ where: { status: "DRAFT" } }),
    db.inquiry.count({ where: { handled: false } }),
  ]);

  // Rooms taken on each of the next 30 nights.
  const nights = Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(today.getTime() + index * 86_400_000);
    const taken = stays.filter((stay) => stay.checkIn <= date && stay.checkOut > date).reduce((sum, stay) => sum + stay._count.units, 0);
    return { date, taken: Math.min(taken, units) };
  });
  const occupancy = units ? Math.round((nights.reduce((sum, night) => sum + night.taken, 0) / (units * DAYS)) * 100) : 0;
  const tone = occupancy >= 60 ? "good" : occupancy >= 30 ? "warn" : "bad";
  const verdict = occupancy >= 60 ? "Καλή πληρότητα." : occupancy >= 30 ? "Μέτρια πληρότητα, υπάρχουν κενά." : "Χαμηλή πληρότητα, πολλές ελεύθερες βραδιές.";

  const W = 720, H = 180, pad = { l: 28, b: 24, t: 8 };
  const bw = (W - pad.l) / DAYS;
  const y = (value: number) => pad.t + (H - pad.t - pad.b) * (1 - value / Math.max(units, 1));

  return (
    <>
      <PageHead title={`Καλημέρα, ${user.name?.split(" ")[0] ?? ""}`} text="Τι συμβαίνει στο κατάλυμα τις επόμενες 30 ημέρες και τι χρειάζεται ενέργεια." />
      {denied ? <Alert bad>Ο ρόλος σας δεν έχει πρόσβαση σε εκείνη τη σελίδα.</Alert> : null}

      <section className="ad-stats" aria-label="Βασικοί δείκτες">
        <div className="ad-card ad-stat">
          <span className="ad-stat__label"><BedDouble aria-hidden="true" strokeWidth={1.5} />Πληρότητα επόμενων 30 ημερών</span>
          <span className={`ad-stat__value ad-tone--${tone}`}>{occupancy}%</span>
          <span className="ad-stat__note">{verdict}</span>
          {can(user.role, "reservations.read") ? <Link href="/admin/rooms">{occupancy < 60 ? "Δείτε τις τιμές των βιλών" : "Βίλες και τιμές"}</Link> : null}
        </div>
        <div className="ad-card ad-stat">
          <span className="ad-stat__label"><Euro aria-hidden="true" strokeWidth={1.5} />Κρατήσεις αυτού του μήνα</span>
          <span className="ad-stat__value">{eur(month._sum.totalCents ?? 0)}</span>
          <span className="ad-stat__note">{month._count === 0 ? "Καμία νέα κράτηση ακόμη αυτόν τον μήνα." : `Από ${month._count} επιβεβαιωμένες κρατήσεις.`}</span>
          {can(user.role, "reservations.read") ? <Link href="/admin/reservations">Όλες οι κρατήσεις</Link> : null}
        </div>
        <div className="ad-card ad-stat">
          <span className="ad-stat__label"><Mail aria-hidden="true" strokeWidth={1.5} />Μηνύματα χωρίς απάντηση</span>
          <span className={`ad-stat__value ad-tone--${inbox ? "warn" : "good"}`}>{inbox}</span>
          <span className="ad-stat__note">{inbox ? "Περιμένουν απάντηση από εσάς." : "Όλα απαντημένα."}</span>
          {inbox && can(user.role, "messages.read") ? <Link href="/admin/messages">Απαντήστε τώρα</Link> : null}
        </div>
        <div className="ad-card ad-stat">
          <span className="ad-stat__label"><FileText aria-hidden="true" strokeWidth={1.5} />Άρθρα προς έγκριση</span>
          <span className={`ad-stat__value ad-tone--${drafts ? "warn" : "good"}`}>{drafts}</span>
          <span className="ad-stat__note">{drafts ? "Γράφτηκαν αυτόματα και δεν φαίνονται στο site μέχρι να τα εγκρίνετε." : "Δεν υπάρχει πρόχειρο σε αναμονή."}</span>
          {can(user.role, "content.read") ? <Link href="/admin/content">{drafts ? "Διαβάστε και δημοσιεύστε" : "Περιεχόμενο"}</Link> : null}
        </div>
      </section>

      <section className="ad-card" style={{ marginBottom: 24 }}>
        <div className="ad-card__head"><h2>Κλεισμένες βίλες ανά βραδιά</h2><span className="ad-stat__note">{units} βίλες συνολικά. Ψηλή μπάρα σημαίνει ότι είναι κλεισμένες και οι δύο.</span></div>
        <div className="ad-card__body">
          <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Κλεισμένες βίλες ανά βραδιά για τις επόμενες ${DAYS} ημέρες. Μέση πληρότητα ${occupancy}%.`} style={{ width: "100%", height: "auto" }}>
            {Array.from({ length: units + 1 }, (_, value) => (
              <g key={value}>
                <line x1={pad.l} x2={W} y1={y(value)} y2={y(value)} stroke="var(--border-subtle)" strokeWidth="1" />
                <text x={pad.l - 8} y={y(value) + 4} textAnchor="end">{value}</text>
              </g>
            ))}
            {nights.map((night, index) => (
              <g key={index}>
                <rect x={pad.l + index * bw + 2} width={bw - 4} y={y(night.taken)} height={y(0) - y(night.taken)} fill={night.taken === units ? "var(--deep-olive)" : "var(--muted-sage)"} rx="1">
                  <title>{`${day(night.date)}: ${night.taken} από ${units} βίλες`}</title>
                </rect>
                {index % 5 === 0 ? <text x={pad.l + index * bw + bw / 2} y={H - 6} textAnchor="middle">{new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", timeZone: "UTC" }).format(night.date)}</text> : null}
              </g>
            ))}
          </svg>
          <p className="ad-stat__note" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            <span><span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, background: "var(--deep-olive)", marginRight: 6 }} />Και οι δύο βίλες κλεισμένες</span>
            <span><span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, background: "var(--muted-sage)", marginRight: 6 }} />Μία βίλα κλεισμένη</span>
          </p>
        </div>
      </section>

      <section className="ad-card">
        <div className="ad-card__head"><h2>Επόμενες αφίξεις</h2></div>
        {arrivals.length === 0 ? <p className="ad-empty">Δεν υπάρχει επιβεβαιωμένη άφιξη. Οι νέες κρατήσεις θα εμφανιστούν εδώ.</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Άφιξη</TableHead><TableHead>Επισκέπτης</TableHead><TableHead className="ad-hide">Βίλα</TableHead><TableHead>Κατάσταση</TableHead></TableRow></TableHeader>
            <TableBody>
              {arrivals.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{day(row.checkIn)}</TableCell>
                  <TableCell>{row.guestName}</TableCell>
                  <TableCell className="ad-hide">{row.units.map((item) => unitLabel(item.unit.slug)).join(", ")}</TableCell>
                  <TableCell><Status value={row.status as "CONFIRMED"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
