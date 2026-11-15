"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { fmt } from "@/lib/site";

const LOCALES: Record<string, string> = { el: "el-GR", en: "en-GB", de: "de-DE" };
type Line = { name: string; total: number };

/** The guest's folio: what is ticked, itemised, with the amount due today. Display only: the server recomputes every amount. */
export function Folio({ locale, depositPercent, guests, arrive, depart, labels, children }: {
  locale: string;
  depositPercent: number;
  guests: number;
  arrive: string;
  depart: string;
  labels: { title: string; none: string; checkIn: string; checkOut: string; total: string; today: string; later: string; pay: string; cont: string; capacity: string };
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<{ villas: (Line & { photo: string })[]; extras: Line[]; capacity: number }>({ villas: [], extras: [], capacity: 0 });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const picked = [...form.querySelectorAll<HTMLInputElement>('input[name="unit"]:checked')];
      const ids = new Set(picked.map((input) => input.value));
      // An extra counts only if one of the ticked villas offers it (the server applies the same rule).
      const extras = [...form.querySelectorAll<HTMLInputElement>('input[name="extra"]:checked')].filter((input) => (input.dataset.units ?? "").split(" ").some((id) => ids.has(id)));
      setState({
        villas: picked.map((input) => ({ name: input.dataset.line ?? "", photo: input.dataset.photo ?? "", total: Number(input.dataset.total) })),
        extras: extras.map((input) => ({ name: input.dataset.name ?? "", total: Number(input.dataset.total) })),
        capacity: picked.reduce((sum, input) => sum + Number(input.dataset.capacity), 0),
      });
    };
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, []);
  const money = (cents: number) => new Intl.NumberFormat(LOCALES[locale], { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const total = [...state.villas, ...state.extras].reduce((sum, line) => sum + line.total, 0);
  const due = Math.round((total * depositPercent) / 100);
  const none = state.villas.length === 0;
  return (
    <>
      <aside ref={ref} className="bk-folio" aria-label={labels.title}>
        <figure className="bk-folio__media">
          {state.villas[0]?.photo ? <img src={state.villas[0].photo} alt="" /> : null}
          <figcaption>{labels.title}</figcaption>
        </figure>
        <div className="bk-folio__body" aria-live="polite">
          <div className="bk-io">
            <div><small>{labels.checkIn}</small><strong>{arrive}</strong></div>
            <ArrowRight aria-hidden="true" strokeWidth={1.5} />
            <div><small>{labels.checkOut}</small><strong>{depart}</strong></div>
          </div>
          {none ? <p className="bk-folio__none">{labels.none}</p> : (
            <>
              <dl className="bk-lines">
                {[...state.villas, ...state.extras].map((line) => <div key={line.name}><dt>{line.name}</dt><dd>{money(line.total)}</dd></div>)}
              </dl>
              <div className="bk-total"><span>{labels.total}</span><strong>{money(total)}</strong></div>
              {depositPercent < 100 ? (
                <div className="bk-split">
                  <div>{labels.today} ({depositPercent}%)<b>{money(due)}</b></div>
                  <div>{labels.later}<b>{money(total - due)}</b></div>
                </div>
              ) : null}
            </>
          )}
          {!none && state.capacity < guests ? <p className="bk-folio__warn" role="alert">{fmt(labels.capacity, { n: state.capacity })}</p> : null}
          <button className="bk-cta" type="submit" disabled={none}><Lock aria-hidden="true" strokeWidth={1.5} />{none ? labels.cont : fmt(labels.pay, { a: money(due) })}</button>
          {children}
        </div>
      </aside>
      <div className="bk-bar">
        <div><small>{none ? labels.none : labels.total}</small>{none ? null : <strong>{money(total)}</strong>}</div>
        <button className="bk-cta" type="submit" disabled={none}>{labels.cont}</button>
      </div>
    </>
  );
}
