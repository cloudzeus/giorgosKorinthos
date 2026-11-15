"use client";
// The reservations plan. Bars can be dragged to other days or to the other villa, stretched from
// either end to change the length of the stay, and show the booking's basics on hover or focus.
// Every bar is also a link to the reservation page, which is the keyboard route to the same changes.
import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/dg/button";

export interface PlanStay {
  id: string; unitId: string; start: number; end: number; // day indexes from the first of the month; may fall outside it
  name: string; status: "CONFIRMED" | "PENDING" | "BLOCKED"; code: string; dates: string; nights: number; guests: number;
  total: string; paid: string; balance: string; owes: boolean; phone: string | null; movable: boolean;
}
type Mode = "move" | "start" | "end";
interface Drag { id: string; mode: Mode; x: number; y: number; start: number; end: number; row: number; moved: boolean }

const STATUS = { CONFIRMED: "Επιβεβαιωμένη", PENDING: "Αναμονή πληρωμής", BLOCKED: "Κλειστές ημερομηνίες" };
const ROW = 52;

export function PlanBoard({ first, days, units, stays, canEdit, label, move, create }: {
  first: string; // "2026-11-01"
  days: { day: number; weekday: string; today: boolean; weekend: boolean }[];
  units: { id: string; label: string }[];
  stays: PlanStay[];
  canEdit: boolean;
  label: string;
  move: (id: string, unitId: string, inDay: string, outDay: string) => Promise<{ ok: boolean; message?: string }>;
  /** Server action that saves a new reservation or a block of dates. */
  create: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const grid = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [tip, setTip] = useState<{ stay: PlanStay; x: number; y: number } | null>(null);
  const [message, setMessage] = useState<{ bad: boolean; text: string } | null>(null);
  const [fresh, setFresh] = useState<{ row: number; index: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [year, month] = first.split("-").map(Number);
  const dateOf = (index: number) => new Date(Date.UTC(year, month - 1, 1 + index)).toISOString().slice(0, 10);
  const pretty = (index: number) => new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1 + index)));
  const colWidth = () => grid.current?.querySelector<HTMLElement>(".ad-plan__day")?.getBoundingClientRect().width ?? 32;

  const begin = (event: React.PointerEvent, stay: PlanStay, mode: Mode) => {
    if (!canEdit || !stay.movable || pending || event.button !== 0) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setTip(null);
    setDrag({ id: stay.id, mode, x: event.clientX, y: event.clientY, start: stay.start, end: stay.end, row: units.findIndex((unit) => unit.id === stay.unitId), moved: false });
  };

  const onMove = (event: React.PointerEvent, stay: PlanStay) => {
    if (!drag || drag.id !== stay.id) return;
    const dx = Math.round((event.clientX - drag.x) / colWidth());
    const dy = Math.round((event.clientY - drag.y) / ROW);
    const home = units.findIndex((unit) => unit.id === stay.unitId);
    const next = { ...drag, moved: drag.moved || Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4 };
    if (drag.mode === "move") { next.start = stay.start + dx; next.end = stay.end + dx; next.row = Math.min(units.length - 1, Math.max(0, home + dy)); }
    if (drag.mode === "start") next.start = Math.min(stay.start + dx, stay.end - 1);
    if (drag.mode === "end") next.end = Math.max(stay.end + dx, stay.start + 1);
    setDrag(next);
  };

  const drop = (stay: PlanStay) => {
    if (!drag || drag.id !== stay.id) return;
    const result = drag;
    const unit = units[result.row];
    const changed = result.start !== stay.start || result.end !== stay.end || unit.id !== stay.unitId;
    if (!changed) { setDrag(result.moved ? { ...result, mode: "move" } : null); if (result.moved) setTimeout(() => setDrag(null)); return; }
    const summary = `${stay.status === "BLOCKED" ? "Κλειστές ημερομηνίες" : stay.name}\n${unit.label}: ${pretty(result.start)} έως ${pretty(result.end)} (${result.end - result.start} βραδιές)`;
    const note = stay.status === "BLOCKED" ? "" : "\n\nΤο σύνολο θα υπολογιστεί ξανά με τις τιμές των νέων ημερομηνιών. Ο πελάτης δεν ειδοποιείται αυτόματα.";
    if (!window.confirm(`Να αλλάξει η κράτηση;\n\n${summary}${note}`)) { setDrag(null); return; }
    startTransition(async () => {
      const outcome = await move(stay.id, unit.id, dateOf(result.start), dateOf(result.end));
      setMessage(outcome.ok ? { bad: false, text: `Η κράτηση άλλαξε: ${unit.label}, ${pretty(result.start)} έως ${pretty(result.end)}.` } : { bad: true, text: outcome.message ?? "Η αλλαγή δεν έγινε." });
      setDrag(null);
      router.refresh();
    });
  };

  const showTip = (event: React.SyntheticEvent, stay: PlanStay) => {
    if (drag) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ stay, x: Math.min(window.innerWidth - 300, Math.max(12, box.left)), y: box.top });
  };

  return (
    <>
      {message ? <p className={message.bad ? "ad-alert ad-alert--bad" : "ad-alert"} role={message.bad ? "alert" : "status"}><span>{message.text}</span></p> : null}
      <section className={`ad-card ad-plan${pending ? " is-busy" : ""}`} aria-label={label} aria-busy={pending}>
        <div ref={grid} className="ad-plan__grid" style={{ gridTemplateColumns: `minmax(120px, 160px) repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="ad-plan__corner" />
          {days.map((day) => (
            <div key={day.day} className={`ad-plan__day${day.today ? " is-today" : ""}${day.weekend ? " is-weekend" : ""}`}><span>{day.weekday}</span><strong>{day.day}</strong></div>
          ))}
          {units.map((unit, row) => (
            <React.Fragment key={unit.id}>
              <div className="ad-plan__unit" style={{ gridRow: row + 2 }}>{unit.label}</div>
              {days.map((day, index) => {
                const cell = { className: `ad-plan__cell${day.today ? " is-today" : ""}${drag && drag.row === row && index >= drag.start && index < drag.end ? " is-target" : ""}`, style: { gridRow: row + 2, gridColumn: index + 2 } };
                return canEdit
                  ? <button key={index} type="button" {...cell} aria-label={`Νέα κράτηση: ${unit.label}, ${pretty(index)}`} onClick={() => setFresh({ row, index })} />
                  : <div key={index} {...cell} />;
              })}
            </React.Fragment>
          ))}
          {stays.map((stay) => {
            const live = drag?.id === stay.id ? drag : null;
            const start = live?.start ?? stay.start, end = live?.end ?? stay.end;
            const row = live?.row ?? units.findIndex((unit) => unit.id === stay.unitId);
            const from = Math.max(0, start), to = Math.min(days.length, end);
            if (row < 0 || to <= from && !(end > days.length && start < days.length)) return null;
            const span = Math.max(1, to - from);
            const editable = canEdit && stay.movable;
            return (
              <Link
                key={stay.id}
                href={`/admin/reservations/${stay.id}`}
                draggable={false}
                className={`ad-plan__bar ad-plan__bar--${stay.status.toLowerCase()}${live ? " is-dragging" : ""}${editable ? " is-movable" : ""}`}
                style={{ gridRow: row + 2, gridColumn: `${from + 2} / ${from + 2 + span}`, ["--n" as string]: span, ["--in" as string]: start >= 0 ? 1 : 0, ["--out" as string]: end <= days.length ? 1 : 0 }}
                aria-label={`${stay.status === "BLOCKED" ? "Κλειστές ημερομηνίες" : stay.name}, ${stay.dates}, ${STATUS[stay.status]}`}
                onPointerDown={(event) => begin(event, stay, "move")}
                onPointerMove={(event) => onMove(event, stay)}
                onPointerUp={() => drop(stay)}
                onPointerCancel={() => setDrag(null)}
                onClick={(event) => { if (drag?.moved || pending) event.preventDefault(); }}
                onMouseEnter={(event) => showTip(event, stay)}
                onMouseLeave={() => setTip(null)}
                onFocus={(event) => showTip(event, stay)}
                onBlur={() => setTip(null)}
              >
                {editable && start >= 0 ? <i className="ad-plan__grip ad-plan__grip--start" aria-hidden="true" onPointerDown={(event) => begin(event, stay, "start")} /> : null}
                <span>{stay.status === "BLOCKED" ? "Κλειστό" : stay.name}{live ? ` · ${pretty(start)} – ${pretty(end)}` : ""}</span>
                {editable && end <= days.length ? <i className="ad-plan__grip ad-plan__grip--end" aria-hidden="true" onPointerDown={(event) => begin(event, stay, "end")} /> : null}
              </Link>
            );
          })}
        </div>
        <p className="ad-plan__legend">
          <span><i className="ad-plan__bar--confirmed" />Επιβεβαιωμένη</span><span><i className="ad-plan__bar--pending" />Αναμονή πληρωμής</span><span><i className="ad-plan__bar--blocked" />Κλειστές ημερομηνίες</span>
          {canEdit ? <span>Πατήστε μια άδεια ημέρα για νέα κράτηση. Σύρετε μια μπάρα για άλλες ημέρες ή άλλη βίλα, ή την άκρη της για να αλλάξετε τη διάρκεια.</span> : null}
        </p>
      </section>
      <Dialog open={fresh !== null} onOpenChange={(open) => { if (!open) setFresh(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[12px] p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: "var(--font-display)" }}>Νέα κράτηση</DialogTitle>
            <DialogDescription>Κράτηση από τηλέφωνο ή άλλο κανάλι, ή κλείσιμο ημερομηνιών. Οι ημερομηνίες δεσμεύονται αμέσως στο site.</DialogDescription>
          </DialogHeader>
          {fresh ? (
            <form className="ad-form" action={create} onSubmit={() => setFresh(null)}>
              <input type="hidden" name="back" value={first.slice(0, 7)} />
              <div className="ad-field">
                <label htmlFor="pn-kind">Τι καταχωρίζετε</label>
                <select id="pn-kind" name="kind" defaultValue="CONFIRMED"><option value="CONFIRMED">Κράτηση επισκέπτη</option><option value="BLOCKED">Κλειστές ημερομηνίες (χωρίς επισκέπτη)</option></select>
              </div>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="pn-in">Άφιξη</label><input id="pn-in" name="in" type="date" defaultValue={dateOf(fresh.index)} required /></div>
                <div className="ad-field"><label htmlFor="pn-out">Αναχώρηση</label><input id="pn-out" name="out" type="date" defaultValue={dateOf(fresh.index + 1)} required /></div>
              </div>
              <fieldset className="ad-checks">
                <legend>Βίλα</legend>
                {units.map((unit, row) => <label key={unit.id}><input type="checkbox" name="unit" value={unit.id} defaultChecked={row === fresh.row} />{unit.label}</label>)}
              </fieldset>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="pn-name">Ονοματεπώνυμο</label><input id="pn-name" name="guestName" autoComplete="off" /></div>
                <div className="ad-field"><label htmlFor="pn-phone">Τηλέφωνο</label><input id="pn-phone" name="guestPhone" type="tel" autoComplete="off" /></div>
              </div>
              <div className="ad-form__row">
                <div className="ad-field"><label htmlFor="pn-email">Email</label><input id="pn-email" name="guestEmail" type="email" autoComplete="off" /></div>
                <div className="ad-field"><label htmlFor="pn-adults">Άτομα</label><input id="pn-adults" name="adults" type="number" min={1} max={11} defaultValue={2} /></div>
              </div>
              <div className="ad-field"><label htmlFor="pn-notes">Σημειώσεις</label><textarea id="pn-notes" name="notes" /></div>
              <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      {tip ? (
        <div className="ad-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <p className="ad-tip__title">{tip.stay.status === "BLOCKED" ? "Κλειστές ημερομηνίες" : tip.stay.name}</p>
          <p className={`ad-tip__status ad-tip__status--${tip.stay.status.toLowerCase()}`}>{STATUS[tip.stay.status]}</p>
          <dl>
            <div><dt>Διαμονή</dt><dd>{tip.stay.dates}</dd></div>
            <div><dt>Βραδιές</dt><dd>{tip.stay.nights}</dd></div>
            {tip.stay.status !== "BLOCKED" ? (
              <>
                <div><dt>Άτομα</dt><dd>{tip.stay.guests}</dd></div>
                <div><dt>Σύνολο</dt><dd>{tip.stay.total}</dd></div>
                <div><dt>Πληρωμένα</dt><dd>{tip.stay.paid}</dd></div>
                <div><dt>Υπόλοιπο</dt><dd className={tip.stay.owes ? "ad-tone--warn" : "ad-tone--good"}>{tip.stay.owes ? tip.stay.balance : "Εξοφλημένη"}</dd></div>
                {tip.stay.phone ? <div><dt>Τηλέφωνο</dt><dd>{tip.stay.phone}</dd></div> : null}
                <div><dt>Κωδικός</dt><dd>{tip.stay.code}</dd></div>
              </>
            ) : null}
          </dl>
          <p className="ad-tip__hint">{tip.stay.movable ? "Πατήστε για την καρτέλα της κράτησης." : "Έχει δύο βίλες: αλλάζει μόνο από την καρτέλα της."}</p>
        </div>
      ) : null}
    </>
  );
}
