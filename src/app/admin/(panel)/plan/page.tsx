import Link from "next/link";
import { ChevronLeft, ChevronRight, LogIn, LogOut, Home } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { addDays, dayString, parseDay } from "@/lib/booking";
import { PageHead, Status, day, eur, unitLabel } from "@/components/admin/parts";
import { PlanBoard } from "@/components/admin/plan-board";
import { planMove } from "../../ops-actions";

export const metadata = { title: "Πλάνο κρατήσεων" };

const MONTH = new Intl.DateTimeFormat("el-GR", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "narrow", timeZone: "UTC" });

export default async function PlanPage({ searchParams }: PageProps<"/admin/plan">) {
  const user = await requirePermission("reservations.read");
  const query = await searchParams;
  const today = parseDay(dayString(new Date()))!;
  const asked = /^\d{4}-\d{2}$/.test(String(query.m)) ? parseDay(`${query.m}-01`) : null;
  const first = asked ?? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
  const prev = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 1));
  const days = Array.from({ length: Math.round((next.getTime() - first.getTime()) / 86_400_000) }, (_, index) => addDays(first, index));
  const now = new Date();

  const [units, stays] = await Promise.all([
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.reservation.findMany({
      where: { checkIn: { lt: next }, checkOut: { gt: first }, OR: [{ status: { in: ["CONFIRMED", "BLOCKED"] } }, { status: "PENDING", holdExpiresAt: { gt: now } }] },
      orderBy: { checkIn: "asc" }, include: { units: true, payments: true },
    }),
  ]);
  const arriving = stays.filter((stay) => stay.status === "CONFIRMED" && dayString(stay.checkIn) === dayString(today));
  const leaving = stays.filter((stay) => stay.status === "CONFIRMED" && dayString(stay.checkOut) === dayString(today));
  const inHouse = stays.filter((stay) => stay.status === "CONFIRMED" && stay.checkIn <= today && stay.checkOut > today);
  const nights = units.length * days.length;
  const booked = stays.filter((stay) => stay.status === "CONFIRMED").reduce((sum, stay) => {
    const from = stay.checkIn < first ? first : stay.checkIn, to = stay.checkOut > next ? next : stay.checkOut;
    return sum + Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000)) * stay.units.length;
  }, 0);
  const col = (date: Date) => Math.round((date.getTime() - first.getTime()) / 86_400_000) + 2;

  return (
    <>
      <PageHead title="Πλάνο κρατήσεων" text="Κάθε γραμμή είναι μία βίλα και κάθε στήλη μία ημέρα. Σύρετε μια κράτηση για να την αλλάξετε, ή πατήστε τη για την καρτέλα της.">
        <div className="ad-month">
          <Link href={`/admin/plan?m=${dayString(prev).slice(0, 7)}`} aria-label="Προηγούμενος μήνας"><ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
          <strong>{MONTH.format(first)}</strong>
          <Link href={`/admin/plan?m=${dayString(next).slice(0, 7)}`} aria-label="Επόμενος μήνας"><ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
        </div>
      </PageHead>

      <section className="ad-stats" aria-label="Σήμερα">
        <div className="ad-card ad-stat"><span className="ad-stat__label"><LogIn aria-hidden="true" strokeWidth={1.5} />Αφίξεις σήμερα</span><span className="ad-stat__value">{arriving.length}</span><span className="ad-stat__note">{arriving.map((stay) => stay.guestName).join(", ") || "Καμία άφιξη σήμερα."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label"><LogOut aria-hidden="true" strokeWidth={1.5} />Αναχωρήσεις σήμερα</span><span className="ad-stat__value">{leaving.length}</span><span className="ad-stat__note">{leaving.map((stay) => stay.guestName).join(", ") || "Καμία αναχώρηση σήμερα."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label"><Home aria-hidden="true" strokeWidth={1.5} />Στο κτήμα τώρα</span><span className="ad-stat__value">{inHouse.length}</span><span className="ad-stat__note">{inHouse.map((stay) => stay.guestName).join(", ") || "Καμία βίλα κατειλημμένη."}</span></div>
        <div className="ad-card ad-stat"><span className="ad-stat__label">Πληρότητα μήνα</span><span className={`ad-stat__value ad-tone--${booked / nights >= 0.6 ? "good" : booked / nights >= 0.3 ? "warn" : "bad"}`}>{nights ? Math.round((booked / nights) * 100) : 0}%</span><span className="ad-stat__note">{booked} από {nights} βραδιές κλεισμένες.</span></div>
      </section>

      <PlanBoard
        first={dayString(first)}
        label={`Πλάνο ${MONTH.format(first)}`}
        canEdit={can(user.role, "reservations.write")}
        move={planMove}
        days={days.map((date) => ({ day: date.getUTCDate(), weekday: WEEKDAY.format(date), today: dayString(date) === dayString(today), weekend: [0, 6].includes(date.getUTCDay()) }))}
        units={units.map((unit) => ({ id: unit.id, label: unitLabel(unit.slug) }))}
        stays={stays.flatMap((stay) => stay.units.map((item) => {
          const paid = stay.payments.reduce((sum, row) => sum + row.amountCents, 0);
          return {
            id: stay.id, unitId: item.unitId, start: col(stay.checkIn) - 2, end: col(stay.checkOut) - 2,
            name: stay.guestName, status: stay.status as "CONFIRMED" | "PENDING" | "BLOCKED", code: stay.code,
            dates: `${day(stay.checkIn)} έως ${day(stay.checkOut)}`, nights: Math.round((stay.checkOut.getTime() - stay.checkIn.getTime()) / 86_400_000), guests: stay.adults + stay.children,
            total: eur(stay.totalCents), paid: eur(paid), balance: eur(stay.totalCents - paid), owes: stay.totalCents - paid > 0, phone: stay.guestPhone, movable: stay.units.length === 1,
          };
        }))}
      />

      {/* On phones a month grid is unreadable: the same stays as a list. */}
      <section className="ad-card ad-plan-list">
        {stays.length === 0 ? <p className="ad-empty">Καμία κράτηση αυτόν τον μήνα.</p> : (
          <ul>{stays.map((stay) => (
            <li key={stay.id}><Link href={`/admin/reservations/${stay.id}`}><strong>{stay.guestName}</strong><span>{day(stay.checkIn)} έως {day(stay.checkOut)}</span><Status value={stay.status} /></Link></li>
          ))}</ul>
        )}
      </section>
    </>
  );
}
