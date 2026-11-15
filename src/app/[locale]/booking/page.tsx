import type { Metadata } from "next";
import { CircleAlert, Clock, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { DEPOSIT_PERCENT, HOLD_MINUTES, nightsBetween, parseDay, takenUnitIds, validStay } from "@/lib/booking";
import { alternates, getDict, longDate, money } from "@/lib/i18n";
import { fmt, img, unitPhotos, type UnitSlug } from "@/lib/site";
import { BookingBar, PageIntro } from "@/components/site/parts";
import { SelectionSummary } from "./summary";
import { reserve } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/booking">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return { title: t.booking.eyebrow, description: t.booking.lead, alternates: alternates("/booking", locale), robots: { index: false } };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function BookingPage({ params, searchParams }: PageProps<"/[locale]/booking">) {
  const { locale, t } = getDict((await params).locale);
  const query = await searchParams;
  const b = t.booking;
  const checkIn = parseDay(one(query.in));
  const checkOut = parseDay(one(query.out));
  const adults = Math.min(11, Math.max(1, Number(one(query.adults)) || 2));
  const children = Math.min(10, Math.max(0, Number(one(query.children)) || 0));
  const asked = Boolean(one(query.in) || one(query.out));
  const valid = validStay(checkIn, checkOut) && checkOut !== null;
  const errorKey = one(query.error) as keyof typeof b.errors | undefined;

  const nights = valid ? nightsBetween(checkIn, checkOut) : 0;
  const [units, taken] = valid ? await Promise.all([db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }), takenUnitIds(checkIn, checkOut)]) : [[], new Set<string>()];
  const free = units.filter((unit) => !taken.has(unit.id));
  const step = valid ? 2 : 1;

  return (
    <>
      <PageIntro eyebrow={b.eyebrow} lines={b.lines} lead={b.lead} />
      <div className="ep-container ep-stack ep-stack--lg" style={{ paddingBottom: "var(--section)" }}>
        <ol className="ep-steps">
          {b.steps.map((label, index) => (
            <li key={label} className={index + 1 < step ? "is-done" : undefined} aria-current={index + 1 === step ? "step" : undefined}>{label}</li>
          ))}
        </ol>

        <BookingBar locale={locale} t={t} className="ep-bookbar ep-bookbar--solid" values={{ in: one(query.in), out: one(query.out), adults, children }} />

        {!valid ? (
          <p className={asked ? "ep-note ep-note--danger" : "ep-note"} role={asked ? "alert" : undefined}>
            {asked ? <CircleAlert aria-hidden="true" strokeWidth={1.5} /> : <Clock aria-hidden="true" strokeWidth={1.5} />}
            {asked ? b.invalidDates : b.pickDates}
          </p>
        ) : (
          <form className="ep-book" action={reserve} id="rooms">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="in" value={one(query.in)} />
            <input type="hidden" name="out" value={one(query.out)} />
            <input type="hidden" name="adults" value={adults} />
            <input type="hidden" name="children" value={children} />

            <div className="ep-stack ep-stack--lg">
              {errorKey && b.errors[errorKey] ? (
                <p className="ep-note ep-note--danger" role="alert">
                  <CircleAlert aria-hidden="true" strokeWidth={1.5} />
                  {fmt(b.errors[errorKey], { n: units.reduce((sum, unit) => sum + unit.capacity, 0) })}
                </p>
              ) : null}

              <fieldset className="ep-stack" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="mr-h3" style={{ marginBottom: "var(--space-6)" }}>{b.results}</legend>
                {free.length === 0 ? <p className="ep-note ep-note--warn"><CircleAlert aria-hidden="true" strokeWidth={1.5} />{b.noUnits}</p> : null}
                {units.map((unit) => {
                  const slug = unit.slug as UnitSlug;
                  const off = taken.has(unit.id);
                  const photo = unitPhotos[slug]?.[0];
                  return (
                    <label key={unit.id} className={`ep-unit${off ? " ep-unit--off" : ""}`}>
                      <input type="checkbox" name="unit" value={unit.id} disabled={off} data-total={unit.priceCents * nights} data-capacity={unit.capacity} />
                      {photo ? <img src={img(photo.name)} alt="" loading="lazy" /> : <span />}
                      <span className="ep-stack" style={{ gap: "var(--space-1)" }}>
                        <span className="ep-unit__name">{t.units[slug]?.name ?? unit.slug}</span>
                        <span className="ep-unit__meta">
                          <span>{unit.building === "A" ? t.rooms.buildingA : t.rooms.buildingB} · {fmt(b.sleeps, { n: unit.capacity })} · {t.units[slug]?.beds}</span>
                          <span>{off ? b.unavailable : <><strong style={{ color: "var(--text)" }}>{money(unit.priceCents * nights, locale)}</strong> · {money(unit.priceCents, locale)} {b.perNight}</>}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {free.length ? (
                <fieldset className="ep-form" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="mr-h3" style={{ marginBottom: "var(--space-6)" }}>{b.details}</legend>
                  <div className="ep-form__row">
                    <div className="mr-field"><label className="mr-label" htmlFor="g-name">{b.name} *</label><input className="mr-input" id="g-name" name="name" autoComplete="name" required minLength={2} /></div>
                    <div className="mr-field"><label className="mr-label" htmlFor="g-email">{b.email} *</label><input className="mr-input" id="g-email" name="email" type="email" autoComplete="email" required /></div>
                  </div>
                  <div className="mr-field"><label className="mr-label" htmlFor="g-phone">{b.phone}</label><input className="mr-input" id="g-phone" name="phone" type="tel" autoComplete="tel" /></div>
                  <div className="mr-field">
                    <label className="mr-label" htmlFor="g-notes">{b.notes}</label>
                    <textarea className="mr-input" id="g-notes" name="notes" rows={4} aria-describedby="g-notes-hint" />
                    <p className="mr-hint" id="g-notes-hint">{b.notesHint}</p>
                  </div>
                  <label className="ep-check"><input type="checkbox" name="consent" required /><span>{b.consent} *</span></label>
                </fieldset>
              ) : null}
            </div>

            <aside className="ep-panel ep-book__aside" aria-label={b.summary}>
              <h2 className="mr-h3">{b.summary}</h2>
              <dl className="ep-sum">
                <div><dt>{b.checkIn}</dt><dd>{longDate(checkIn, locale)}</dd></div>
                <div><dt>{b.checkOut}</dt><dd>{longDate(checkOut, locale)}</dd></div>
                <div><dt>{b.guests}</dt><dd>{adults + children}</dd></div>
                <div><dt>{nights === 1 ? b.night : fmt(b.nights, { n: nights })}</dt><dd /></div>
              </dl>
              <SelectionSummary
                locale={locale}
                depositPercent={DEPOSIT_PERCENT}
                guests={adults + children}
                labels={{ none: b.none, selected: b.selected, total: b.total, deposit: fmt(b.deposit, { p: DEPOSIT_PERCENT }), balance: b.balance, capacity: b.errors.capacity }}
              />
              <button className="mr-btn" type="submit" disabled={!free.length}><Lock aria-hidden="true" size={16} strokeWidth={1.5} />{b.pay}</button>
              <p className="mr-hint">{b.payNote}</p>
              <p className="mr-hint">{fmt(b.hold, { m: HOLD_MINUTES })}</p>
            </aside>
          </form>
        )}
      </div>
    </>
  );
}
