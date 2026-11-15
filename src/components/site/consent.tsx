"use client";
// Cookie choice + Google tags. Nothing from Google is loaded until the visitor accepts.
import { useEffect, useState } from "react";

const KEY = "ephyria-cookies";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

function loadGoogle({ ga, ads, gtm }: { ga?: string; ads?: string; gtm?: string }) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array.
  window.gtag = function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  const add = (src: string) => { const script = document.createElement("script"); script.async = true; script.src = src; document.head.appendChild(script); };
  if (gtm) { window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" }); add(`https://www.googletagmanager.com/gtm.js?id=${gtm}`); }
  const first = ga || ads;
  if (first) {
    add(`https://www.googletagmanager.com/gtag/js?id=${first}`);
    window.gtag("js", new Date());
    if (ga) window.gtag("config", ga, { anonymize_ip: true });
    if (ads) window.gtag("config", ads);
  }
}

export function Consent({ ids, labels }: { ids: { ga?: string; ads?: string; gtm?: string }; labels: { text: string; accept: string; decline: string; label: string } }) {
  const [ask, setAsk] = useState(false);
  const any = Boolean(ids.ga || ids.ads || ids.gtm);
  useEffect(() => {
    if (!any) return;
    let choice: string | null = null;
    try { choice = localStorage.getItem(KEY); } catch {}
    if (choice === "yes") loadGoogle(ids);
    // The stored choice exists only in the browser, so the banner can only be decided after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (choice !== "no") setAsk(true);
  }, [any, ids]);
  if (!any || !ask) return null;
  const choose = (yes: boolean) => {
    try { localStorage.setItem(KEY, yes ? "yes" : "no"); } catch {}
    if (yes) loadGoogle(ids);
    setAsk(false);
  };
  return (
    <div className="ep-cookie" role="region" aria-label={labels.label}>
      <p>{labels.text}</p>
      <div>
        <button type="button" className="mr-btn mr-btn--secondary" onClick={() => choose(false)}>{labels.decline}</button>
        <button type="button" className="mr-btn" onClick={() => choose(true)}>{labels.accept}</button>
      </div>
    </div>
  );
}

/** Reports a completed booking to Google Ads / Analytics, once, if the visitor accepted cookies. */
export function BookingConversion({ code, value, ads, label }: { code: string; value: number; ads?: string; label?: string }) {
  useEffect(() => {
    const key = `ephyria-conv-${code}`;
    try {
      if (!window.gtag || sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { return; }
    window.gtag("event", "purchase", { transaction_id: code, value, currency: "EUR" });
    if (ads && label) window.gtag("event", "conversion", { send_to: `${ads}/${label}`, value, currency: "EUR", transaction_id: code });
  }, [code, value, ads, label]);
  return null;
}
