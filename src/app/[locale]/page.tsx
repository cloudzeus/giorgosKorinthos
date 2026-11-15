import Link from "next/link";
import { db } from "@/lib/db";
import { getDict, longDate } from "@/lib/i18n";
import { contact, img, places } from "@/lib/site";
import { AnimatedHeading } from "@/components/ds/AnimatedHeading";
import { SplitTextReveal } from "@/components/ds/SplitTextReveal";
import { ImageMaskReveal } from "@/components/ds/ImageMaskReveal";
import { ParallaxImage } from "@/components/ds/ParallaxImage";
import { ParallaxSection } from "@/components/ds/ParallaxSection";
import { PinnedStorySection } from "@/components/ds/PinnedStorySection";
import { FadeInSection } from "@/components/ds/FadeInSection";
import { MagneticButton } from "@/components/ds/MagneticButton";
import { Drift, HeroMotion, Stagger, StickyBook } from "@/components/site/motion-kit";
import { BookingBar, RoomCard } from "@/components/site/parts";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, t } = getDict((await params).locale);
  const base = `/${locale}`;
  const [units, posts] = await Promise.all([
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" }, take: 4 }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 3, include: { translations: { where: { locale } } } }),
  ]);
  const stepPhotos = [{ name: "outdoor-03", alt: t.alt.bbq }, { name: "outdoor-04", alt: t.alt.garden }, { name: "indoor-30", alt: t.alt.spa }];

  return (
    <>
      {/* 1. Immersive hero */}
      <HeroMotion id="hero">
        <img className="ep-hero__media" src={img("outdoor-08")} alt={t.alt.poolDusk} fetchPriority="high" />
        <div className="ep-container ep-hero__body">
          <p className="mr-eyebrow" data-hero-fade>{t.hero.eyebrow}</p>
          <h1 className="mr-h1">{t.hero.lines.map((line) => <span className="mr-m-line" key={line}><span>{line}</span></span>)}</h1>
          <p className="mr-lead" data-hero-fade>{t.hero.lead}</p>
        </div>
        <div className="ep-container ep-hero__foot" data-hero-fade>
          <BookingBar locale={locale} t={t} />
          <a className="ep-scrollcue" href="#philosophy"><i aria-hidden="true" />{t.hero.scroll}</a>
        </div>
      </HeroMotion>

      {/* 2. Philosophy: two photographs drifting at different speeds */}
      <section id="philosophy" className="ep-section">
        <div className="ep-container ep-grid ep-duo">
          <div className="ep-duo__text ep-stack">
            <p className="mr-eyebrow">{t.philosophy.eyebrow}</p>
            <AnimatedHeading lines={t.philosophy.lines} />
            <SplitTextReveal text={t.philosophy.text} className="mr-lead mr-muted" stagger={0.02} />
            <p className="mr-editorial">{t.philosophy.quote}</p>
            <Link className="mr-btn mr-btn--secondary" style={{ justifySelf: "start" }} href={`${base}/villa`}>{t.philosophy.cta}</Link>
          </div>
          <ImageMaskReveal className="ep-duo__main" src={img("outdoor-09")} alt={t.alt.olive} ratio="4 / 5" />
          <Drift className="ep-duo__float" amount={70}>
            <div className="mr-m-media" style={{ aspectRatio: "4 / 3" }}><img src={img("indoor-14")} alt={t.alt.view} loading="lazy" /></div>
          </Drift>
        </div>
        <div className="ep-container" style={{ marginTop: "var(--section)" }}>
          <Stagger selector=".ep-facts > div">
            <dl className="ep-facts">
              {t.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
          </Stagger>
        </div>
      </section>

      {/* 3. Rooms, asymmetric */}
      <section className="ep-section ep-section--alt">
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-stack">
            <p className="mr-eyebrow">{t.rooms.eyebrow}</p>
            <AnimatedHeading lines={t.rooms.lines} />
            <p className="mr-lead mr-muted">{t.rooms.lead}</p>
          </div>
          <div className="ep-rooms">
            {units.map((unit, index) => (
              <FadeInSection as="div" key={unit.id}><RoomCard unit={unit} locale={locale} t={t} wide={index % 4 === 0 || index % 4 === 3} /></FadeInSection>
            ))}
          </div>
          <Link className="mr-btn mr-btn--secondary" style={{ justifySelf: "start" }} href={`${base}/accommodation`}>{t.rooms.all}</Link>
        </div>
      </section>

      {/* 4. The pool: full-screen parallax */}
      <ParallaxSection src={img("outdoor-11")} alt={t.alt.poolNight} minHeight="110dvh">
        <div className="ep-stack" style={{ maxWidth: 720 }}>
          <p className="mr-eyebrow">{t.pool.eyebrow}</p>
          <AnimatedHeading lines={t.pool.lines} />
          <SplitTextReveal text={t.pool.text} />
        </div>
      </ParallaxSection>

      {/* 5. Outdoor living: the one pinned story of the page */}
      <PinnedStorySection
        label={t.living.label}
        steps={t.living.steps.map((step, index) => ({ ...step, src: img(stepPhotos[index].name), alt: stepPhotos[index].alt }))}
      />

      {/* 6. Discover Corinth */}
      <section className="ep-section">
        <div className="ep-container ep-grid">
          <div className="ep-stack" style={{ gridColumn: "1 / -1" }}>
            <p className="mr-eyebrow">{t.explore.eyebrow}</p>
            <AnimatedHeading lines={t.explore.lines} />
            <p className="mr-lead mr-muted">{t.explore.lead}</p>
          </div>
          <div style={{ gridColumn: "1 / -1", marginTop: "var(--space-12)" }}>
            <ParallaxImage src={img("indoor-14")} alt={t.alt.view} ratio="21 / 9" amount={10} />
          </div>
          <div style={{ gridColumn: "1 / -1", marginTop: "var(--space-12)" }}>
            <Stagger className="ep-places" selector=".ep-place">
              {places.slice(0, 4).map((place, index) => (
                <article className="ep-place" key={place.slug}>
                  <span className="ep-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="mr-eyebrow">{t.explore.categories[place.category]}</p>
                    <h3 className="mr-h3">{t.places[place.slug].name}</h3>
                  </div>
                  <p className="mr-body mr-muted">{t.places[place.slug].summary}</p>
                  <p className="mr-tag">{t.explore.visit}: {t.places[place.slug].duration}</p>
                </article>
              ))}
            </Stagger>
          </div>
          <Link className="mr-btn mr-btn--secondary" style={{ gridColumn: "1 / -1", justifySelf: "start", marginTop: "var(--space-8)" }} href={`${base}/explore-corinth`}>{t.explore.cta}</Link>
        </div>
        {posts.length ? (
          <div className="ep-container ep-stack" style={{ marginTop: "var(--section)" }}>
            <p className="mr-eyebrow">{t.explore.journal}</p>
            <div className="ep-journal">
              {posts.map((post) => post.translations[0] ? (
                <Link className="ep-post" key={post.id} href={`${base}/explore-corinth/${post.slug}`}>
                  <span className="mr-tag">{post.publishedAt ? longDate(post.publishedAt, locale) : ""}</span>
                  <h3 className="mr-h3">{post.translations[0].title}</h3>
                  <p className="mr-body mr-muted">{post.translations[0].excerpt}</p>
                </Link>
              ) : null)}
            </div>
          </div>
        ) : null}
      </section>

      {/* 7. Reserve */}
      <section id="reserve" className="ep-section ep-section--inverse mr-on-inverse">
        <div className="ep-container ep-grid">
          <div className="ep-stack" style={{ gridColumn: "1 / -1" }}>
            <p className="mr-eyebrow">{t.reserve.eyebrow}</p>
            <AnimatedHeading lines={t.reserve.lines} />
            <p className="mr-lead" style={{ color: "var(--text-inverse-muted)" }}>{t.reserve.text}</p>
            <div><MagneticButton><Link className="mr-btn mr-btn--inverse" href={`${base}/booking`}>{t.reserve.cta}</Link></MagneticButton></div>
          </div>
        </div>
      </section>

      {/* 8. Concierge */}
      <section className="ep-section">
        <div className="ep-container ep-grid ep-duo ep-duo--reverse">
          <div className="ep-duo__text ep-stack">
            <p className="mr-eyebrow">{t.concierge.eyebrow}</p>
            <AnimatedHeading lines={t.concierge.lines} />
            <p className="mr-lead mr-muted">{t.concierge.text}</p>
            <div className="mr-row">
              <a className="mr-btn" href={contact.phoneHref}>{t.concierge.call}</a>
              <Link className="mr-btn mr-btn--secondary" href={`${base}/contact`}>{t.concierge.email}</Link>
            </div>
          </div>
          <ImageMaskReveal className="ep-duo__main" src={img("indoor-15")} alt={t.alt.lounge} ratio="4 / 5" />
        </div>
      </section>

      <StickyBook title={t.bookbar.sticky} sub={t.bookbar.stickySub} href={`${base}/booking`} cta={t.bookbar.submit} />
    </>
  );
}
