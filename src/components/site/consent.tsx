"use client";
// Cookie choice + Google tags with Consent Mode v2. Nothing from Google is loaded until the visitor allows a category.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const KEY = "ephyria-cookies";
const OPEN = "ephyria:cookies";
type Prefs = { analytics: boolean; ads: boolean };
type Ids = { ga?: string; ads?: string; gtm?: string };
export interface ConsentLabels {
  label: string; text: string; acceptAll: string; onlyNecessary: string; settings: string; save: string; close: string; title: string; intro: string; always: string;
  necessary: [string, string]; analytics: [string, string]; ads: [string, string]; more: string; policy: string; policyHref: string;
}

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

/** The stored choice. Older versions stored "yes" or "no". */
function read(): Prefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "yes") return { analytics: true, ads: true };
    if (raw === "no") return { analytics: false, ads: false };
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" ? { analytics: value.analytics === true, ads: value.ads === true } : null;
  } catch { return null; }
}

const signals = ({ analytics, ads }: Prefs) => {
  const state = (on: boolean) => (on ? "granted" : "denied");
  return { analytics_storage: state(analytics), ad_storage: state(ads), ad_user_data: state(ads), ad_personalization: state(ads) };
};

function applyGoogle(ids: Ids, prefs: Prefs) {
  if (window.gtag) { window.gtag("consent", "update", signals(prefs)); return; } // already loaded: only the permissions change
  if (!prefs.analytics && !prefs.ads) return;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array.
  window.gtag = function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag("consent", "default", signals({ analytics: false, ads: false }));
  window.gtag("consent", "update", signals(prefs));
  const add = (src: string) => { const script = document.createElement("script"); script.async = true; script.src = src; document.head.appendChild(script); };
  if (ids.gtm) { window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" }); add(`https://www.googletagmanager.com/gtm.js?id=${ids.gtm}`); }
  const first = (prefs.analytics && ids.ga) || (prefs.ads && ids.ads);
  if (first) {
    add(`https://www.googletagmanager.com/gtag/js?id=${first}`);
    window.gtag("js", new Date());
    if (prefs.analytics && ids.ga) window.gtag("config", ids.ga, { anonymize_ip: true });
    if (prefs.ads && ids.ads) window.gtag("config", ids.ads);
  }
}

export function Consent({ ids, labels }: { ids: Ids; labels: ConsentLabels }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [banner, setBanner] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ analytics: false, ads: false });
  const any = Boolean(ids.ga || ids.ads || ids.gtm);

  useEffect(() => {
    const stored = read();
    // The stored choice exists only in the browser, so it can only be read after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) { setPrefs(stored); if (any) applyGoogle(ids, stored); }
    else if (any) setBanner(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const open = () => { setPrefs(read() ?? { analytics: false, ads: false }); dialog.current?.showModal(); };
    window.addEventListener(OPEN, open);
    return () => window.removeEventListener(OPEN, open);
  }, [any, ids]);

  const choose = (next: Prefs) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setPrefs(next);
    if (any) applyGoogle(ids, next);
    setBanner(false);
    dialog.current?.close();
  };
  const row = (id: keyof Prefs, [name, text]: [string, string]) => (
    <label className="ep-consent__row">
      <span><strong>{name}</strong><span>{text}</span></span>
      <input type="checkbox" role="switch" checked={prefs[id]} onChange={(event) => setPrefs({ ...prefs, [id]: event.target.checked })} />
    </label>
  );

  return (
    <>
      {banner ? (
        <div className="ep-cookie" role="region" aria-label={labels.label}>
          <p>{labels.text} <Link href={labels.policyHref}>{labels.policy}</Link></p>
          <div>
            <button type="button" className="mr-btn mr-btn--link" onClick={() => dialog.current?.showModal()}>{labels.settings}</button>
            <button type="button" className="mr-btn mr-btn--secondary" onClick={() => choose({ analytics: false, ads: false })}>{labels.onlyNecessary}</button>
            <button type="button" className="mr-btn" onClick={() => choose({ analytics: true, ads: true })}>{labels.acceptAll}</button>
          </div>
        </div>
      ) : null}
      <dialog ref={dialog} className="ep-consent" aria-labelledby="ep-consent-title">
        <h2 id="ep-consent-title">{labels.title}</h2>
        <p>{labels.intro} {labels.more} <Link href={labels.policyHref} onClick={() => dialog.current?.close()}>{labels.policy}</Link>.</p>
        <div className="ep-consent__row">
          <span><strong>{labels.necessary[0]}</strong><span>{labels.necessary[1]}</span></span>
          <em>{labels.always}</em>
        </div>
        {row("analytics", labels.analytics)}
        {row("ads", labels.ads)}
        <div className="ep-consent__foot">
          <button type="button" className="mr-btn mr-btn--secondary" onClick={() => choose({ analytics: false, ads: false })}>{labels.onlyNecessary}</button>
          <button type="button" className="mr-btn mr-btn--secondary" onClick={() => choose(prefs)}>{labels.save}</button>
          <button type="button" className="mr-btn" onClick={() => choose({ analytics: true, ads: true })}>{labels.acceptAll}</button>
        </div>
      </dialog>
    </>
  );
}

/** Footer control that reopens the cookie settings. */
export function CookieSettingsButton({ children }: { children: React.ReactNode }) {
  return <button type="button" className="ep-footer__link" onClick={() => window.dispatchEvent(new Event(OPEN))}>{children}</button>;
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
