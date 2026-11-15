// Server-rendered building blocks shared by the public pages.
import Link from "next/link";
import type { Unit } from "@prisma/client";
import { HeroMotion } from "./motion-kit";
import { AutoVideo, Botanical, Frame, Title } from "./fx";
import { money, type Dict, type Locale } from "@/lib/i18n";
import { fmt, img, pools, unitPhotos, type UnitSlug } from "@/lib/site";
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

/**
 * A pool photograph whose water moves. The same picture is drawn again in an SVG, clipped to the water
 * surface and pushed through an animated displacement filter, so only the pool ripples. No JavaScript.
 * The viewBox uses "slice", which crops exactly like object-fit: cover on the photograph underneath.
 */
export function PoolImage({ name, alt, className = "", priority }: { name: keyof typeof pools & string; alt: string; className?: string; priority?: boolean }) {
  const { w, h, water } = pools[name];
  const points = water.map(([x, y]) => [(x * w) / 100, (y * h) / 100]);
  const xs = points.map((point) => point[0]), ys = points.map((point) => point[1]);
  const box = { x: Math.min(...xs) - 20, y: Math.min(...ys) - 20, width: Math.max(...xs) - Math.min(...xs) + 40, height: Math.max(...ys) - Math.min(...ys) + 40 };
  return (
    <div className={`ep-pool ${className}`}>
      <img src={img(name)} alt={alt} fetchPriority={priority ? "high" : undefined} loading={priority ? undefined : "lazy"} />
      <svg className="ep-water" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`ripple-${name}`} filterUnits="userSpaceOnUse" {...box} colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise">
              <animate attributeName="baseFrequency" dur="16s" values="0.006 0.02;0.011 0.034;0.006 0.02" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <clipPath id={`water-${name}`}><polygon points={points.map((point) => point.join(",")).join(" ")} /></clipPath>
        </defs>
        <g clipPath={`url(#water-${name})`}>
          <image href={img(name)} width={w} height={h} filter={`url(#ripple-${name})`} />
        </g>
      </svg>
    </div>
  );
}

/** Hero headline: masked lines, the last one in italic. */
export function HeroTitle({ lines }: { lines: string[] }) {
  return (
    <h1 className="ep-display">
      {lines.map((line, index) => (
        <span className="mr-m-line" key={line}><span>{index === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}</span></span>
      ))}
    </h1>
  );
}

/** Photograph hero for inner pages, with the same choreography as the homepage. */
export function PageHero({ src, alt, eyebrow, lines, lead, video }: { src: string; alt: string; eyebrow: string; lines: string[]; lead?: string; video?: string | null }) {
  return (
    <HeroMotion className="ep-hero--page">
      <div className="ep-pool ep-hero__media">{video ? <AutoVideo src={video} poster={src} label={alt} /> : <img src={src} alt={alt} fetchPriority="high" />}</div>
      <div className="ep-container ep-hero__body">
        <p className="mr-eyebrow" data-hero-fade>{eyebrow}</p>
        <div className="ep-hero__row">
          <HeroTitle lines={lines} />
          {lead ? <p className="mr-lead" data-hero-fade>{lead}</p> : null}
        </div>
      </div>
    </HeroMotion>
  );
}

/** Text-only page header on ivory, for pages without a hero photograph. */
export function PageIntro({ eyebrow, lines, lead }: { eyebrow: string; lines: string[]; lead?: string }) {
  return (
    <header className="ep-leafy" style={{ paddingTop: "calc(80px + var(--section) / 1.6)", paddingBottom: "var(--space-12)" }}>
      <Botanical name="branch-gold-c" className="ep-deco--tr ep-deco--sm" from="right" rotate={16} drift={50} />
      <div className="ep-container ep-stack">
      <p className="mr-eyebrow">{eyebrow}</p>
      <Title as="h1" className="ep-display" lines={lines} />
      {lead ? <p className="mr-lead mr-muted">{lead}</p> : null}
      </div>
    </header>
  );
}

/** One villa as a wide editorial block: arched photograph, facts and price. Alternates sides. */
export function VillaBlock({ unit, locale, t, reverse, index }: { unit: Unit; locale: Locale; t: Dict; reverse?: boolean; index: number }) {
  const slug = unit.slug as UnitSlug;
  const copy = t.units[slug];
  const shots = unitPhotos[slug];
  if (!copy || !shots) return null;
  const href = `/${locale}/accommodation/${unit.slug}`;
  return (
    <article className={`ep-villa${reverse ? " ep-villa--reverse" : ""}`}>
      <div className="ep-villa__media">
        <Frame src={img(shots[0].name)} alt={`${copy.name}: ${t.alt[shots[0].alt]}`} arch speed={10} className="ep-villa__main" />
        <Frame src={img(shots[1].name)} alt={`${copy.name}: ${t.alt[shots[1].alt]}`} speed={-8} className="ep-villa__side" />
      </div>
      <div className="ep-villa__body">
        <p className="ep-number">{String(index + 1).padStart(2, "0")}</p>
        <Title lines={[copy.name]} className="ep-display" />
        <p className="mr-lead mr-muted">{copy.text}</p>
        <dl className="ep-specs">
          <div><dt>{t.rooms.bedsLabel}</dt><dd>{copy.rooms.length}</dd></div>
          <div><dt>{t.booking.guests}</dt><dd>{unit.capacity}</dd></div>
          <div><dt>{t.rooms.from} / {t.rooms.perNight}</dt><dd>{money(unit.priceCents, locale)}</dd></div>
        </dl>
        <div className="mr-row">
          <Link className="mr-btn" href={href}>{t.rooms.explore}</Link>
          <Link className="mr-btn mr-btn--secondary" href={`/${locale}/booking`}>{t.rooms.book}</Link>
        </div>
      </div>
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

export { fmt };
