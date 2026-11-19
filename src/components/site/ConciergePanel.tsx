"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Video } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import { concierge } from "@/lib/site";
import { usePresence } from "./ConciergeLink";

// Live bridge to the hotelVideo concierge app (video.ephyria.gr):
//  • month calendar of free 30-min slots (GET /api/public/availability, one call per day)
//  • request a video meeting (POST /api/public/appointments → REQUESTED). Staff confirm it there,
//    and hotelVideo then emails the guest the join link.
//  • "video call now" → signal staff, then open /room/reception
export type ConciergeStrings = Dict["contact"]["concierge"];

const LOCALES: Record<string, string> = { el: "el-GR", en: "en-GB", de: "de-DE" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS_AHEAD = 2;
const pad = (n: number) => String(n).padStart(2, "0");
const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const EMPTY = { name: "", email: "", phone: "", timing: "DURING", message: "" };

export default function ConciergePanel({ strings: s, labels, hotelName, locale, today }: {
  strings: ConciergeStrings;
  labels: { prev: string; next: string };
  hotelName: string;
  locale: string;
  /** Today in Athens, YYYY-MM-DD. */
  today: string;
}) {
  const { url, companyId } = concierge;
  const online = usePresence();
  const minMonth = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1;
  const [month, setMonth] = useState(minMonth);
  /** Free slot starts (UTC ISO) per loaded day. A day missing here is still loading. */
  const [free, setFree] = useState<Record<string, string[]>>({});
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const loc = LOCALES[locale] ?? "en-GB";
  const time = new Intl.DateTimeFormat(loc, { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false });
  const dayLabel = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
  const fullLabel = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekday = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => weekday.format(new Date(Date.UTC(2024, 0, 1 + i)))); // 1 Jan 2024 is a Monday

  const year = Math.floor(month / 12), m = month % 12;
  const lead = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();

  // shortcut: one availability request per remaining day of the visible month (up to 31 small GETs).
  // Give hotelVideo a ?month=YYYY-MM endpoint if this ever gets slow.
  useEffect(() => {
    let alive = true;
    const days = Array.from({ length: count }, (_, i) => `${year}-${pad(m + 1)}-${pad(i + 1)}`).filter((d) => d >= today);
    Promise.all(days.map((d) =>
      fetch(`${url}/api/public/availability?companyId=${encodeURIComponent(companyId)}&date=${d}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => [d, (Array.isArray(data.slots) ? data.slots as string[] : []).filter((iso) => new Date(iso).getTime() > Date.now())] as const)
        .catch(() => { if (alive) setLoadFailed(true); return [d, [] as string[]] as const; }),
    )).then((entries) => alive && setFree((old) => ({ ...old, ...Object.fromEntries(entries) })));
    return () => { alive = false; };
  }, [month, count, year, m, today, url, companyId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const fail = (message: string) => { setState("error"); setErrorMsg(message); };
    if (name.length < 2 || !slot) return fail(s.requiredError);
    if (!EMAIL_RE.test(form.email.trim())) return fail(s.emailError);
    const [firstName, ...rest] = name.split(/\s+/);
    setState("sending");
    try {
      const r = await fetch(`${url}/api/public/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId,
          scheduledAt: slot, // already a UTC ISO slot start from the availability endpoint
          timing: form.timing,
          locale,
          guest: { firstName, lastName: rest.join(" ") || firstName, email: form.email.trim(), phone: form.phone.trim() || null },
          notes: form.message.trim() || null,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setFree((old) => ({ ...old, [day]: (old[day] ?? []).filter((iso) => iso !== slot) }));
      setState("sent");
    } catch {
      fail(s.error);
    }
  }

  async function callNow() {
    // Instant path: signal staff a guest is waiting, then open the reception room.
    try {
      await fetch(`${url}/api/public/concierge-call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, guest: form.name.trim() ? { firstName: form.name.trim() } : undefined }),
      });
    } catch {
      /* non-blocking */
    }
    window.open(`${url}/room/reception?name=${encodeURIComponent(hotelName)}&companyId=${encodeURIComponent(companyId)}`, "_blank", "noopener,noreferrer");
  }

  const reset = () => { setState("idle"); setDay(""); setSlot(""); setForm(EMPTY); };
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const slots = day ? free[day] : undefined;

  return (
    <div className="bk-grid">
      {state === "sent" ? (
        <div className="bk-main ep-stack" role="status">
          <div className="bk-sh"><h2>{s.sentTitle}</h2></div>
          <p className="ep-note"><CircleCheck aria-hidden="true" strokeWidth={1.5} />{s.sent}</p>
          <div><button className="mr-btn mr-btn--secondary" type="button" onClick={reset}>{s.another}</button></div>
        </div>
      ) : (
        <form className="bk-main" onSubmit={submit} noValidate>
          <section>
            <div className="bk-sh"><span>01</span><h2>{s.stepWhen}</h2><p>{s.stepWhenHint}</p></div>
            <div className="cc-when">
              <div className="bk-cal">
                <div className="bk-cal__head">
                  <button type="button" aria-label={labels.prev} disabled={month <= minMonth} onClick={() => setMonth(month - 1)}><ChevronLeft aria-hidden="true" strokeWidth={1.5} /></button>
                  <strong aria-live="polite">{monthLabel.format(new Date(Date.UTC(year, m, 1)))}</strong>
                  <button type="button" aria-label={labels.next} disabled={month >= minMonth + MONTHS_AHEAD} onClick={() => setMonth(month + 1)}><ChevronRight aria-hidden="true" strokeWidth={1.5} /></button>
                </div>
                <div className="bk-days">
                  {weekdays.map((name) => <span className="bk-dow" key={name}>{name}</span>)}
                  {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
                  {Array.from({ length: count }, (_, i) => {
                    const d = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
                    const past = d < today;
                    const open = free[d];
                    const cls = d === day ? "is-start cc-free" : past ? "is-past" : !open ? "cc-wait" : open.length ? "cc-free" : "is-off";
                    return (
                      <button type="button" key={d} className={cls} disabled={past || !open?.length} aria-pressed={d === day} aria-label={fullLabel.format(utc(d))} onClick={() => { setDay(d); setSlot(""); }}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="bk-legend" style={{ marginTop: "var(--space-4)" }}><span>{s.legendFree}</span><span>{s.legendOff}</span></div>
              </div>
              <div className="cc-times" aria-live="polite">
                <h3>{day ? dayLabel.format(utc(day)) : s.pickSlot}</h3>
                {loadFailed ? <p className="ep-note ep-note--danger" role="alert"><CircleAlert aria-hidden="true" strokeWidth={1.5} />{s.error}</p>
                  : !day ? <p className="bk-hint">{s.chooseDay}</p>
                  : !slots ? <p className="bk-hint">{s.slotsLoading}</p>
                  : slots.length === 0 ? <p className="bk-hint">{s.noSlots}</p>
                  : (
                    <div className="cc-slots" role="group" aria-label={s.pickSlot}>
                      {slots.map((iso) => <button type="button" key={iso} aria-pressed={slot === iso} onClick={() => setSlot(iso)}>{time.format(new Date(iso))}</button>)}
                    </div>
                  )}
              </div>
            </div>
          </section>

          <section className="ep-form">
            <div className="bk-sh" style={{ marginBottom: 0 }}><span>02</span><h2>{s.stepYou}</h2></div>
            <div className="ep-form__row">
              <div className="mr-field">
                <label className="mr-label" htmlFor="cc-name">{s.name} *</label>
                <input className="mr-input" id="cc-name" value={form.name} autoComplete="name" onChange={set("name")} required />
              </div>
              <div className="mr-field">
                <label className="mr-label" htmlFor="cc-email">{s.email} *</label>
                <input className="mr-input" id="cc-email" type="email" value={form.email} autoComplete="email" onChange={set("email")} required />
              </div>
            </div>
            <div className="ep-form__row">
              <div className="mr-field">
                <label className="mr-label" htmlFor="cc-phone">{s.phone}</label>
                <input className="mr-input" id="cc-phone" type="tel" value={form.phone} autoComplete="tel" onChange={set("phone")} />
              </div>
              <div className="mr-field">
                <label className="mr-label" htmlFor="cc-timing">{s.timing}</label>
                <select className="mr-input" id="cc-timing" value={form.timing} onChange={set("timing")}>
                  <option value="BEFORE">{s.timingBefore}</option>
                  <option value="DURING">{s.timingDuring}</option>
                  <option value="AFTER">{s.timingAfter}</option>
                </select>
              </div>
            </div>
            <div className="mr-field">
              <label className="mr-label" htmlFor="cc-message">{s.message}</label>
              <textarea className="mr-input" id="cc-message" rows={4} value={form.message} onChange={set("message")} />
            </div>
            {state === "error" ? <p className="ep-note ep-note--danger" role="alert"><CircleAlert aria-hidden="true" strokeWidth={1.5} />{errorMsg}</p> : null}
            <div><button className="mr-btn" type="submit" disabled={state === "sending"}>{state === "sending" ? s.submitting : s.submit}</button></div>
          </section>
        </form>
      )}

      <aside className="bk-folio cc-folio" aria-label={s.summary}>
        <div className="bk-folio__body">
          <p className="cc-presence">
            <span className="cc-dot" data-on={online ? "" : undefined} aria-hidden="true" />
            {online === null ? s.presenceChecking : online ? s.presenceOnline : s.presenceOffline}
          </p>
          <div className="bk-io">
            <div><small>{s.day}</small><strong>{day ? dayLabel.format(utc(day)) : s.choose}</strong></div>
            <CalendarCheck aria-hidden="true" strokeWidth={1.5} />
            <div><small>{s.time}</small><strong>{slot ? time.format(new Date(slot)) : s.choose}</strong></div>
          </div>
          <div>
            <h3 className="cc-folio__h">{s.nextTitle}</h3>
            <ol className="cc-next">{s.next.map((step, i) => <li key={step}><b>{i + 1}</b><span>{step}</span></li>)}</ol>
          </div>
          <button className="bk-cta" type="button" onClick={callNow}><Video aria-hidden="true" strokeWidth={1.5} />{s.callNow}</button>
          <p className="bk-folio__none">{s.callNowHint}</p>
        </div>
      </aside>
    </div>
  );
}
