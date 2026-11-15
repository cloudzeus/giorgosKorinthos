"use client";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/site";

const LOCALES: Record<string, string> = { el: "el-GR", en: "en-GB", de: "de-DE" };

/** Live total for the ticked rooms. Display only: the server recomputes every amount from the database. */
export function SelectionSummary({ locale, depositPercent, guests, labels }: {
  locale: string;
  depositPercent: number;
  guests: number;
  labels: { none: string; selected: string; total: string; deposit: string; balance: string; capacity: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ count: 0, total: 0, capacity: 0 });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const picked = [...form.querySelectorAll<HTMLInputElement>('input[name="unit"]:checked')];
      setState({
        count: picked.length,
        total: picked.reduce((sum, input) => sum + Number(input.dataset.total), 0),
        capacity: picked.reduce((sum, input) => sum + Number(input.dataset.capacity), 0),
      });
    };
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, []);
  const money = (cents: number) => new Intl.NumberFormat(LOCALES[locale], { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const due = Math.round((state.total * depositPercent) / 100);
  return (
    <div ref={ref} aria-live="polite" className="ep-stack" style={{ gap: "var(--space-3)" }}>
      {state.count === 0 ? <p className="mr-hint">{labels.none}</p> : (
        <dl className="ep-sum">
          <div><dt>{labels.selected}</dt><dd>{state.count}</dd></div>
          <div className="ep-sum__total"><dt>{labels.total}</dt><dd>{money(state.total)}</dd></div>
          {depositPercent < 100 ? (
            <>
              <div><dt>{labels.deposit}</dt><dd>{money(due)}</dd></div>
              <div><dt>{labels.balance}</dt><dd>{money(state.total - due)}</dd></div>
            </>
          ) : null}
        </dl>
      )}
      {state.count > 0 && state.capacity < guests ? <p className="mr-error">{fmt(labels.capacity, { n: state.capacity })}</p> : null}
    </div>
  );
}
