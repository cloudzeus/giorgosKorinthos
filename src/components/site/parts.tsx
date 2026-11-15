// Server-rendered building blocks shared by the public pages.
import Link from "next/link";
import type { Unit } from "@prisma/client";
import { AnimatedHeading } from "@/components/ds/AnimatedHeading";
import { HeroMotion } from "./motion-kit";
import { money, type Dict, type Locale } from "@/lib/i18n";
import { fmt, img, unitPhotos, type UnitSlug } from "@/lib/site";
import { dayString } from "@/lib/booking";

/** Date and guest form. A plain GET form: works without JavaScript and the URL can be shared. */
export function BookingBar({ locale, t, className = "ep-bookbar", values }: {
  locale: Locale;
  t: Dict;
  className?: string;
  values?: { in?: string; out?: string; adults?: number; children?: number };
}) {
  const today = dayString(new Date());
  return (
    <form className={className} action={`/${locale}/booking`} method="get">
      <div className="mr-field">
        <label className="mr-label" htmlFor="bb-in">{t.bookbar.checkIn}</label>
        <input className="mr-input" id="bb-in" name="in" type="date" min={today} defaultValue={values?.in} required />
      </div>
      <div className="mr-field">
        <label className="mr-label" htmlFor="bb-out">{t.bookbar.checkOut}</label>
        <input className="mr-input" id="bb-out" name="out" type="date" min={today} defaultValue={values?.out} required />
      </div>
      <div className="mr-field">
        <label className="mr-label" htmlFor="bb-adults">{t.bookbar.adults}</label>
        <input className="mr-input" id="bb-adults" name="adults" type="number" inputMode="numeric" min={1} max={11} defaultValue={values?.adults ?? 2} required />
      </div>
      <div className="mr-field">
        <label className="mr-label" htmlFor="bb-children">{t.bookbar.children}</label>
        <input className="mr-input" id="bb-children" name="children" type="number" inputMode="numeric" min={0} max={10} defaultValue={values?.children ?? 0} />
      </div>
      <button className="mr-btn mr-btn--inverse" type="submit">{t.bookbar.submit}</button>
    </form>
  );
}

/** Photograph hero for inner pages, with the same parallax as the homepage. */
export function PageHero({ src, alt, eyebrow, lines, lead }: { src: string; alt: string; eyebrow: string; lines: string[]; lead?: string }) {
  return (
    <HeroMotion className="ep-hero--page">
      <img className="ep-hero__media" src={src} alt={alt} fetchPriority="high" />
      <div className="ep-container ep-hero__body">
        <p className="mr-eyebrow" data-hero-fade>{eyebrow}</p>
        <h1 className="mr-h1">{lines.map((line) => <span className="mr-m-line" key={line}><span>{line}</span></span>)}</h1>
        {lead ? <p className="mr-lead" data-hero-fade>{lead}</p> : null}
      </div>
    </HeroMotion>
  );
}

/** Text-only page header on ivory, for pages without a hero photograph. */
export function PageIntro({ eyebrow, lines, lead }: { eyebrow: string; lines: string[]; lead?: string }) {
  return (
    <header className="ep-container ep-stack" style={{ paddingTop: "calc(72px + var(--section) / 1.6)", paddingBottom: "var(--space-12)" }}>
      <p className="mr-eyebrow">{eyebrow}</p>
      <AnimatedHeading as="h1" className="mr-h1" lines={lines} />
      {lead ? <p className="mr-lead mr-muted">{lead}</p> : null}
    </header>
  );
}

export function RoomCard({ unit, locale, t, wide }: { unit: Unit; locale: Locale; t: Dict; wide?: boolean }) {
  const slug = unit.slug as UnitSlug;
  const copy = t.units[slug];
  const photo = unitPhotos[slug]?.[0];
  if (!copy || !photo) return null;
  return (
    <article className="mr-room">
      <Link className="ep-room__link" href={`/${locale}/accommodation/${unit.slug}`}>
        <div className={`mr-room__media ep-room__media${wide ? " mr-room__media--wide" : ""}`}>
          <img src={img(photo.name)} alt={t.alt[photo.alt]} loading="lazy" />
        </div>
        <div className="mr-room__body">
          <p className="mr-eyebrow">{unit.building === "A" ? t.rooms.buildingA : t.rooms.buildingB}</p>
          <h3 className="mr-h3">{copy.name}</h3>
          <p className="mr-room__text">{copy.text}</p>
        </div>
        <div className="mr-room__foot">
          <ul className="mr-room__tags">
            <li className="mr-tag">{fmt(t.rooms.sleeps, { n: unit.capacity })}</li>
            <li className="mr-tag">{copy.beds}</li>
          </ul>
          <span className="ep-price">{money(unit.priceCents, locale)} <span className="mr-tag">{t.rooms.perNight}</span></span>
        </div>
      </Link>
    </article>
  );
}

/** Minimal Markdown for generated articles: paragraphs and "## " headings. Text is rendered as text, never as HTML. */
export function Prose({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className="ep-prose">
      {blocks.map((block, index) =>
        block.startsWith("#") ? <h2 key={index}>{block.replace(/^#+\s*/, "")}</h2> : <p key={index}>{block.replace(/\*\*/g, "")}</p>,
      )}
    </div>
  );
}
