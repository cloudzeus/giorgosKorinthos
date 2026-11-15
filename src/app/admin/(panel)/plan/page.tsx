import Link from "next/link";
import { ChevronLeft, ChevronRight, LogIn, LogOut, Home } from "lucide-react";
import { requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { addDays, dayString, parseDay } from "@/lib/booking";
import { PageHead, Status, day, unitLabel } from "@/components/admin/parts";

export const metadata = { title: "Πλάνο κρατήσεων" };

const MONTH = new Intl.DateTimeFormat("el-GR", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "narrow", timeZone: "UTC" });

export default async function PlanPage({ searchParams }: PageProps<"/admin/plan">) {
  await requirePermission("reservations.read");
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
      orderBy: { checkIn: "asc" }, include: { units: true },
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
      <PageHead title="Πλάνο κρατήσεων" text="Κάθε γραμμή είναι μία βίλα και κάθε στήλη μία ημέρα. Πατήστε μια μπάρα για να ανοίξετε την κράτηση.">
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

      <section className="ad-card ad-plan" aria-label={`Πλάνο ${MONTH.format(first)}`}>
        <div className="ad-plan__grid" style={{ gridTemplateColumns: `minmax(120px, 160px) repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="ad-plan__corner" />
          {days.map((date, index) => (
            <div key={index} className={`ad-plan__day${dayString(date) === dayString(today) ? " is-today" : ""}${[0, 6].includes(date.getUTCDay()) ? " is-weekend" : ""}`}>
              <span>{WEEKDAY.format(date)}</span><strong>{date.getUTCDate()}</strong>
            </div>
          ))}
          {units.map((unit, row) => (
            <div key={unit.id} style={{ display: "contents" }}>
              <div className="ad-plan__unit" style={{ gridRow: row + 2 }}>{unitLabel(unit.slug)}</div>
              {days.map((date, index) => <div key={index} className={`ad-plan__cell${dayString(date) === dayString(today) ? " is-today" : ""}`} style={{ gridRow: row + 2, gridColumn: index + 2 }} />)}
              {stays.filter((stay) => stay.units.some((item) => item.unitId === unit.id)).map((stay) => {
                const start = Math.max(2, col(stay.checkIn)), end = Math.min(days.length + 2, col(stay.checkOut));
                return (
                  <Link key={stay.id} href={`/admin/reservations/${stay.id}`} className={`ad-plan__bar ad-plan__bar--${stay.status.toLowerCase()}`} style={{ gridRow: row + 2, gridColumn: `${start} / ${Math.max(end, start + 1)}`, ["--n" as string]: Math.max(end - start, 1), ["--in" as string]: stay.checkIn >= first ? 1 : 0, ["--out" as string]: stay.checkOut <= next && end > start ? 1 : 0 }} title={`${stay.guestName}: ${day(stay.checkIn)} έως ${day(stay.checkOut)}`}>
                    <span>{stay.status === "BLOCKED" ? "Κλειστό" : stay.guestName}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <p className="ad-plan__legend">
          <span><i className="ad-plan__bar--confirmed" />Επιβεβαιωμένη</span><span><i className="ad-plan__bar--pending" />Αναμονή πληρωμής</span><span><i className="ad-plan__bar--blocked" />Κλειστές ημερομηνίες</span>
        </p>
      </section>

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
