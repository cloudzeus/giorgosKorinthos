import type { Metadata } from "next";
import { BedDouble, Check, CircleAlert, Clock, House, Plus, ShieldCheck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { addDays, dayString, DEPOSIT_PERCENT, extraTotal, fullNights, HOLD_MINUTES, nightsBetween, parseDay, stayPrice, takenUnitIds, validStay } from "@/lib/booking";
import { alternates, getDict, money } from "@/lib/i18n";
import { fmt, img, unitPhotos, type UnitSlug } from "@/lib/site";
import { Folio } from "./summary";
import { StayPicker } from "./stay-picker";
import { reserve } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/booking">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.booking.eyebrow, description: t.booking.lead, alternates: alternates("/booking", locale), robots: { index: false } };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const LOCALES = { el: "el-GR", en: "en-GB", de: "de-DE" } as const;

export default async function BookingPage({ params, searchParams }: PageProps<"/[locale]/booking">) {
  const { locale, t } = await getDict((await params).locale);
  const query = await searchParams;
  const b = t.booking;
  const f = t.bookflow;
  const checkIn = parseDay(one(query.in));
  const checkOut = parseDay(one(query.out));
  const adults = Math.min(11, Math.max(1, Number(one(query.adults)) || 2));
  const children = Math.min(10, Math.max(0, Number(one(query.children)) || 0));
  const asked = Boolean(one(query.in) || one(query.out));
  const valid = validStay(checkIn, checkOut) && checkOut !== null;
  const errorKey = one(query.error) as keyof typeof b.errors | undefined;
  const today = parseDay(dayString(new Date()))!;

  const nights = valid ? nightsBetween(checkIn, checkOut) : 0;
  const [units, taken, blocked] = await Promise.all([
    valid ? db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" }, include: { rates: true } }) : [],
    valid ? takenUnitIds(checkIn, checkOut) : new Set<string>(),
    fullNights(today, addDays(today, 560)),
  ]);
  const free = units.filter((unit) => !taken.has(unit.id));
  const extras = free.length ? await db.extra.findMany({ where: { active: true, units: { some: { id: { in: free.map((unit) => unit.id) } } } }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], include: { translations: { where: { locale: { in: [locale, "el"] } } }, units: { select: { id: true } } } }) : [];
  const per = { PER_STAY: t.extras.perStay, PER_NIGHT: t.extras.perNight, PER_PERSON: t.extras.perPerson };
  const step = valid ? 2 : 1;
  const nightsLabel = nights === 1 ? b.night : fmt(b.nights, { n: nights });
  const short = new Intl.DateTimeFormat(LOCALES[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const head = (n: string, title: string, note?: string) => <div className="bk-sh"><span aria-hidden="true">{n}</span><h2>{title}</h2>{note ? <p>{note}</p> : null}</div>;

  return (
    <div className="ep-container bk">
      <header className="bk-head">
        <div>
          <p className="mr-eyebrow">{b.eyebrow}</p>
          <h1>{b.lines.join(" ")}</h1>
        </div>
        <ol className="bk-rail">
          {f.rail.map((label, index) => (
            <li key={label} className={index + 1 < step ? "is-done" : undefined} aria-current={index + 1 === step ? "step" : undefined}><b>{String(index + 1).padStart(2, "0")}</b><span>{label}</span></li>
          ))}
        </ol>
      </header>

      <form className={valid ? "bk-grid" : "bk-grid bk-grid--single"} action={reserve}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="in" value={one(query.in) ?? ""} />
        <input type="hidden" name="out" value={one(query.out) ?? ""} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />

        <div className="bk-main">
          <section>
            {head("01", f.when)}
            <StayPicker
              key={`${one(query.in)}-${one(query.out)}-${adults}-${children}`}
              locale={locale}
              today={dayString(today)}
              value={{ in: valid ? one(query.in) : undefined, out: valid ? one(query.out) : undefined, adults, children }}
              blocked={blocked}
              labels={{ checkIn: b.checkIn, checkOut: b.checkOut, nights: f.nightsWord, guests: b.guests, adults: b.adults, children: b.children, choose: f.choosePh, hint: f.whenHint, legendStay: f.legendStay, legendOff: f.legendOff, prev: f.prev, next: f.next, fewer: f.fewer, more: f.more }}
            />
            {!valid ? (
              <p className={asked ? "ep-note ep-note--danger" : "ep-note"} role={asked ? "alert" : undefined} style={{ marginTop: "var(--space-6)" }}>
                {asked ? <CircleAlert aria-hidden="true" strokeWidth={1.5} /> : <Clock aria-hidden="true" strokeWidth={1.5} />}
                {asked ? b.invalidDates : b.pickDates}
              </p>
            ) : null}
          </section>

          {valid ? (
            <section id="rooms">
              {head("02", f.choose, nightsLabel)}
              {errorKey && b.errors[errorKey] ? (
                <p className="ep-note ep-note--danger" role="alert" style={{ marginBottom: "var(--space-6)" }}>
                  <CircleAlert aria-hidden="true" strokeWidth={1.5} />
                  {fmt(b.errors[errorKey], { n: errorKey === "minNights" ? Number(one(query.n)) || 2 : units.reduce((sum, unit) => sum + unit.capacity, 0) })}
                </p>
              ) : null}
              {free.length === 0 ? <p className="ep-note ep-note--warn" style={{ marginBottom: "var(--space-6)" }}><CircleAlert aria-hidden="true" strokeWidth={1.5} />{b.noUnits}</p> : null}
              <div className="bk-villas">
                {units.map((unit) => {
                  const slug = unit.slug as UnitSlug;
                  const off = taken.has(unit.id);
                  const photo = unitPhotos[slug]?.[0];
                  const total = stayPrice(unit.priceCents, unit.rates, checkIn, checkOut).totalCents;
                  const name = t.units[slug]?.name ?? unit.slug;
                  return (
                    <label key={unit.id} className={off ? "bk-villa is-off" : "bk-villa"}>
                      <input type="checkbox" name="unit" value={unit.id} disabled={off} data-total={total} data-capacity={unit.capacity} data-photo={photo ? img(photo.name) : ""} data-line={`${name} · ${nightsLabel}`} />
                      <span className="bk-tick" aria-hidden="true"><Check strokeWidth={1.5} /></span>
                      <figure>{photo ? <img src={img(photo.name)} alt="" loading="lazy" /> : null}<span>{fmt(b.sleeps, { n: unit.capacity })}</span></figure>
                      <span className="bk-villa__body">
                        <span><span className="bk-villa__name">{name}</span><span className="bk-villa__text">{t.units[slug]?.text}</span></span>
                        <span className="bk-facts">
                          <span><Users aria-hidden="true" strokeWidth={1.5} />{fmt(b.sleeps, { n: unit.capacity })}</span>
                          <span><BedDouble aria-hidden="true" strokeWidth={1.5} />{t.units[slug]?.beds}</span>
                        </span>
                        <span className="bk-price">
                          {off ? <span className="bk-villa__text">{b.unavailable}</span> : (
                            <>
                              <span><small>{money(Math.round(total / nights), locale)} {b.perNight} · {nightsLabel}</small><strong>{money(total, locale)}</strong></span>
                              <span className="bk-pick"><span className="is-no">{f.pick}</span><span className="is-yes">{f.picked}</span></span>
                            </>
                          )}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {free.length > 1 ? <p className="bk-both"><Users aria-hidden="true" strokeWidth={1.5} />{fmt(f.both, { n: free.reduce((sum, unit) => sum + unit.capacity, 0) })}</p> : null}
            </section>
          ) : null}

          {extras.length ? (
            <section>
              {head("03", f.extras, f.optional)}
              <div className="bk-extras">
                {extras.map((extra) => {
                  const copy = extra.translations.find((row) => row.locale === locale) ?? extra.translations[0];
                  const total = extraTotal(extra.priceCents, extra.pricing, nights, adults + children);
                  return (
                    <label key={extra.id} className={extra.photos[0] ? "bk-extra" : "bk-extra bk-extra--plain"}>
                      <input type="checkbox" name="extra" value={extra.id} data-total={total} data-name={copy?.name} data-units={extra.units.map((unit) => unit.id).join(" ")} />
                      {extra.photos[0] ? <figure><img src={extra.photos[0]} alt="" loading="lazy" /></figure> : null}
                      <span className="bk-extra__body">
                        <span className="bk-extra__name">{copy?.name}</span>
                        {copy?.description ? <span className="bk-villa__text">{copy.description}</span> : null}
                        <span className="bk-add"><span className="is-no"><Plus aria-hidden="true" strokeWidth={1.5} />{f.add}</span><span className="is-yes"><Check aria-hidden="true" strokeWidth={1.5} />{f.added}</span></span>
                      </span>
                      <span className="bk-extra__amt"><strong>{money(total, locale)}</strong>{money(extra.priceCents, locale)} {per[extra.pricing]}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}

          {free.length ? (
            <section>
              {head(extras.length ? "04" : "03", b.details, f.detailsHint)}
              <div className="bk-form">
                <div className="bk-f"><label htmlFor="g-name">{b.name} *</label><input id="g-name" name="name" autoComplete="name" required minLength={2} /></div>
                <div className="bk-f"><label htmlFor="g-email">{b.email} *</label><input id="g-email" name="email" type="email" autoComplete="email" required aria-describedby="g-email-hint" /><small id="g-email-hint">{f.emailHint}</small></div>
                <div className="bk-f"><label htmlFor="g-phone">{b.phone}</label><input id="g-phone" name="phone" type="tel" autoComplete="tel" aria-describedby="g-phone-hint" /><small id="g-phone-hint">{f.phoneHint}</small></div>
                <div className="bk-f"><label htmlFor="g-arrival">{f.arrival}</label><input id="g-arrival" name="arrival" placeholder={f.arrivalPh} maxLength={40} /></div>
                <div className="bk-f bk-f--wide"><label htmlFor="g-notes">{f.notes}</label><textarea id="g-notes" name="notes" rows={3} aria-describedby="g-notes-hint" /><small id="g-notes-hint">{f.notesHint}</small></div>
                <label className="ep-check bk-f--wide"><input type="checkbox" name="consent" required /><span>{b.consent} *</span></label>
              </div>
            </section>
          ) : null}
        </div>

        {valid ? (
          <Folio
            locale={locale}
            depositPercent={DEPOSIT_PERCENT}
            guests={adults + children}
            arrive={short.format(checkIn)}
            depart={short.format(checkOut)}
            labels={{ title: b.summary, none: b.none, checkIn: b.checkIn, checkOut: b.checkOut, total: b.total, today: f.payToday, later: f.atArrival, pay: f.payAmount, cont: f.continue, capacity: b.errors.capacity }}
          >
            <ul className="bk-trust">
              <li><ShieldCheck aria-hidden="true" strokeWidth={1.5} />{b.payNote}</li>
              <li><Clock aria-hidden="true" strokeWidth={1.5} />{fmt(b.hold, { m: HOLD_MINUTES })}</li>
              <li><House aria-hidden="true" strokeWidth={1.5} />{nightsLabel} · {adults + children} {b.guests.toLowerCase()}</li>
            </ul>
          </Folio>
        ) : null}
      </form>
    </div>
  );
}
