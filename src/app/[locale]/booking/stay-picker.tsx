"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

const LOCALES: Record<string, string> = { el: "el-GR", en: "en-GB", de: "de-DE" };
const pad = (n: number) => String(n).padStart(2, "0");
const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const next = (day: string) => new Date(utc(day).getTime() + 86_400_000).toISOString().slice(0, 10);

type Labels = { checkIn: string; checkOut: string; nights: string; guests: string; adults: string; children: string; choose: string; hint: string; legendStay: string; legendOff: string; prev: string; next: string; fewer: string; more: string };

/** Range calendar and guest steppers. A finished choice reloads the page with the dates in the URL, where the server checks availability. */
export function StayPicker({ locale, today, value, blocked, labels }: {
  locale: string;
  today: string;
  value: { in?: string; out?: string; adults: number; children: number };
  /** Nights on which every villa is taken. */
  blocked: string[];
  labels: Labels;
}) {
  const router = useRouter();
  const [start, setStart] = useState(value.in ?? "");
  const [end, setEnd] = useState(value.out ?? "");
  const [adults, setAdults] = useState(value.adults);
  const [children, setChildren] = useState(value.children);
  const minMonth = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1;
  const [month, setMonth] = useState(start ? Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1 : minMonth);
  const off = new Set(blocked);
  const loc = LOCALES[locale] ?? "en-GB";
  const dayLabel = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
  const fullLabel = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekday = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => weekday.format(new Date(Date.UTC(2024, 0, 1 + i)))); // 1 Jan 2024 is a Monday

  /** No fully booked night between arrival and departure. */
  const clear = (from: string, to: string) => {
    for (let day = from; day < to; day = next(day)) if (off.has(day)) return false;
    return true;
  };
  const go = (a: string, b: string, ad: number, ch: number) => router.replace(`/${locale}/booking?in=${a}&out=${b}&adults=${ad}&children=${ch}`, { scroll: false });
  const pick = (day: string) => {
    if (start && !end && day > start && clear(start, day)) { setEnd(day); go(start, day, adults, children); }
    else if (!off.has(day)) { setStart(day); setEnd(""); }
  };
  const guests = (ad: number, ch: number) => { setAdults(ad); setChildren(ch); if (start && end) go(start, end, ad, ch); };
  const nights = start && end ? Math.round((utc(end).getTime() - utc(start).getTime()) / 86_400_000) : 0;

  const renderMonth = (index: number, second: boolean) => {
    const year = Math.floor(index / 12), m = index % 12;
    const lead = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    return (
      <div className={second ? "bk-cal bk-cal--second" : "bk-cal"} key={index}>
        <div className="bk-cal__head">
          {second ? <span /> : <button type="button" aria-label={labels.prev} disabled={month <= minMonth} onClick={() => setMonth(month - 1)}><ChevronLeft aria-hidden="true" strokeWidth={1.5} /></button>}
          <strong aria-live="polite">{monthLabel.format(new Date(Date.UTC(year, m, 1)))}</strong>
          <button type="button" className={second ? undefined : "bk-cal__next"} aria-label={labels.next} disabled={month >= minMonth + 17} onClick={() => setMonth(month + 1)}><ChevronRight aria-hidden="true" strokeWidth={1.5} /></button>
        </div>
        <div className="bk-days">
          {weekdays.map((name) => <i key={name}>{name}</i>)}
          {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
          {Array.from({ length: count }, (_, i) => {
            const day = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
            const past = day < today;
            const canEnd = Boolean(start && !end && day > start && clear(start, day));
            const taken = off.has(day) && !canEnd;
            const state = day === start ? "is-start" : day === end ? "is-end" : start && end && day > start && day < end ? "is-in" : taken && !past ? "is-off" : past ? "is-past" : "";
            return (
              <button type="button" key={day} className={`${state}${day === start && end ? " has-end" : ""}`} disabled={past || taken} aria-pressed={day === start || day === end} aria-label={fullLabel.format(utc(day))} onClick={() => pick(day)}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const stepper = (label: string, count: number, min: number, max: number, set: (n: number) => void) => (
    <div className="bk-step" role="group" aria-label={label}>
      <span>{label}</span>
      <button type="button" aria-label={`${labels.fewer}: ${label}`} disabled={count <= min} onClick={() => set(count - 1)}><Minus aria-hidden="true" strokeWidth={1.5} /></button>
      <b aria-live="polite">{count}</b>
      <button type="button" aria-label={`${labels.more}: ${label}`} disabled={count >= max} onClick={() => set(count + 1)}><Plus aria-hidden="true" strokeWidth={1.5} /></button>
    </div>
  );

  return (
    <div className="bk-picker">
      <div className="bk-dates">
        <div><small>{labels.checkIn}</small><strong className={start ? undefined : "is-empty"}>{start ? dayLabel.format(utc(start)) : labels.choose}</strong></div>
        <div><small>{labels.checkOut}</small><strong className={end ? undefined : "is-empty"}>{end ? dayLabel.format(utc(end)) : labels.choose}</strong></div>
        <div className="bk-dates__n"><strong>{nights || "–"}</strong><small>{labels.nights}</small></div>
        <div><small>{labels.guests}</small><strong>{adults + children}</strong></div>
      </div>
      <p className="bk-hint">{labels.hint}</p>
      <div className="bk-cals">{renderMonth(month, false)}{renderMonth(month + 1, true)}</div>
      <div className="bk-under">
        <div className="bk-legend"><span>{labels.legendStay}</span><span>{labels.legendOff}</span></div>
        <div className="bk-guests">
          {stepper(labels.adults, adults, 1, 11, (n) => guests(n, children))}
          {stepper(labels.children, children, 0, 10, (n) => guests(adults, n))}
        </div>
      </div>
    </div>
  );
}
