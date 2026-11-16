"use client";

import { useEffect, useState } from "react";

// Live bridge to the hotelVideo concierge app (video.ephyria.gr):
//  • polls public operator-status every 30s → online/offline badge
//  • primary: request a concierge video meeting (POST /api/public/appointments → REQUESTED)
//  • secondary: "video call now" → signal staff (ServiceRequest) then open /room/reception
export type ConciergeStrings = {
  eyebrow: string;
  title: string;
  lead: string;
  presenceOnline: string;
  presenceOffline: string;
  presenceChecking: string;
  formTitle: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  timing: string;
  timingBefore: string;
  timingDuring: string;
  timingAfter: string;
  message: string;
  submit: string;
  submitting: string;
  sent: string;
  error: string;
  emailError: string;
  requiredError: string;
  callNow: string;
  callNowHint: string;
};

type Props = {
  strings: ConciergeStrings;
  conciergeUrl: string;
  companyId: string;
  hotelName: string;
  locale: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConciergePanel({ strings: s, conciergeUrl, companyId, hotelName, locale }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", timing: "DURING", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Poll operator presence every 30s.
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    const url = `${conciergeUrl}/api/public/operator-status?companyId=${encodeURIComponent(companyId)}`;
    const check = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        const d = await r.json();
        if (alive) setOnline(!!d.online);
      } catch {
        if (alive) setOnline(false);
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conciergeUrl, companyId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2 || !form.date) {
      setState("error");
      setErrorMsg(s.requiredError);
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setState("error");
      setErrorMsg(s.emailError);
      return;
    }
    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    setState("sending");
    setErrorMsg("");
    try {
      const r = await fetch(`${conciergeUrl}/api/public/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId,
          scheduledAt: new Date(form.date).toISOString(),
          timing: form.timing,
          locale,
          guest: { firstName, lastName, email: form.email.trim(), phone: form.phone.trim() || null },
          notes: form.message.trim() || null,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setState("sent");
      setForm({ name: "", email: "", phone: "", date: "", timing: "DURING", message: "" });
    } catch {
      setState("error");
      setErrorMsg(s.error);
    }
  }

  async function callNow() {
    // Best-effort staff signal, then open the always-on reception room.
    try {
      await fetch(`${conciergeUrl}/api/public/concierge-call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, guest: form.name.trim() ? { firstName: form.name.trim() } : undefined }),
      });
    } catch {
      /* non-blocking */
    }
    const url = `${conciergeUrl}/room/reception?name=${encodeURIComponent(hotelName)}&companyId=${encodeURIComponent(companyId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const badge =
    online === null
      ? { text: s.presenceChecking, color: "var(--text-muted, #8a8a82)" }
      : online
        ? { text: s.presenceOnline, color: "#2f9e44" }
        : { text: s.presenceOffline, color: "var(--text-muted, #8a8a82)" };

  return (
    <div className="ep-stack">
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--fs-13)" }}>
        <span
          aria-hidden="true"
          style={{ width: 9, height: 9, borderRadius: "50%", background: badge.color, display: "inline-block" }}
        />
        <span style={{ color: badge.color }}>{badge.text}</span>
      </div>

      <form className="ep-form" onSubmit={submit} noValidate>
        {state === "sent" ? (
          <p className="ep-note" role="status">{s.sent}</p>
        ) : null}
        {state === "error" ? (
          <p className="ep-note ep-note--danger" role="alert">{errorMsg}</p>
        ) : null}
        <div className="ep-form__row">
          <div className="mr-field">
            <label className="mr-label" htmlFor="cc-name">{s.name} *</label>
            <input className="mr-input" id="cc-name" value={form.name} autoComplete="name"
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="mr-field">
            <label className="mr-label" htmlFor="cc-email">{s.email} *</label>
            <input className="mr-input" id="cc-email" type="email" value={form.email} autoComplete="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
        </div>
        <div className="ep-form__row">
          <div className="mr-field">
            <label className="mr-label" htmlFor="cc-phone">{s.phone}</label>
            <input className="mr-input" id="cc-phone" type="tel" value={form.phone} autoComplete="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="mr-field">
            <label className="mr-label" htmlFor="cc-date">{s.date} *</label>
            <input className="mr-input" id="cc-date" type="datetime-local" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div className="mr-field">
          <label className="mr-label" htmlFor="cc-timing">{s.timing}</label>
          <select className="mr-input" id="cc-timing" value={form.timing}
            onChange={(e) => setForm({ ...form, timing: e.target.value })}>
            <option value="BEFORE">{s.timingBefore}</option>
            <option value="DURING">{s.timingDuring}</option>
            <option value="AFTER">{s.timingAfter}</option>
          </select>
        </div>
        <div className="mr-field">
          <label className="mr-label" htmlFor="cc-message">{s.message}</label>
          <textarea className="mr-input" id="cc-message" rows={4} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3, 0.75rem)", alignItems: "center" }}>
          <button className="mr-btn" type="submit" disabled={state === "sending"}>
            {state === "sending" ? s.submitting : s.submit}
          </button>
          <button className="mr-btn mr-btn--secondary" type="button" onClick={callNow}>
            {s.callNow}
          </button>
        </div>
        <p className="ep-note" style={{ marginTop: 0 }}>{s.callNowHint}</p>
      </form>
    </div>
  );
}
