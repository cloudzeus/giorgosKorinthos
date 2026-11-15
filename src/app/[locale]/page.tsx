import Link from "next/link";
import { db } from "@/lib/db";
import { getDict, longDate } from "@/lib/i18n";
import { contact, img, placeImg, places } from "@/lib/site";
import { slotMap } from "@/lib/media";
import { MagneticButton } from "@/components/ds/MagneticButton";
import { HeroMotion } from "@/components/site/motion-kit";
import { ArchReveal, AutoVideo, Botanical, CountUp, Frame, HorizontalScroll, Marquee, Ornament, ParallaxCover, Scenes, ScrubText, Stagger, Title } from "@/components/site/fx";
import { BookingBar, HeroTitle, PoolImage, VillaBlock } from "@/components/site/parts";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, t } = getDict((await params).locale);
  const base = `/${locale}`;
  const [media, units, posts] = await Promise.all([
    slotMap(),
    db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 3, include: { translations: { where: { locale } } } }),
  ]);
  const scenes = [{ name: "outdoor-03", alt: t.alt.bbq }, { name: "outdoor-04", alt: t.alt.garden }, { name: "indoor-30", alt: t.alt.spa }];
  const journey = [
    { name: "indoor-02", alt: t.alt.living }, { name: "indoor-14", alt: t.alt.view }, { name: "indoor-15", alt: t.alt.lounge }, { name: "indoor-06", alt: t.alt.kitchen },
    { name: "indoor-19", alt: t.alt.bedroom }, { name: "indoor-13-1", alt: t.alt.bath }, { name: "indoor-30", alt: t.alt.spa }, { name: "outdoor-07", alt: t.alt.facadeDusk },
  ];

  return (
    <>
      {/* 1. Hero */}
      <HeroMotion id="hero">
        <PoolImage name="outdoor-08" alt={t.alt.poolDusk} className="ep-hero__media" priority />
        <div className="ep-container ep-hero__body">
          <p className="mr-eyebrow" data-hero-fade>{t.hero.eyebrow}</p>
          <div className="ep-hero__row">
            <HeroTitle lines={t.hero.lines} />
            <p className="mr-lead" data-hero-fade>{t.hero.lead}</p>
          </div>
        </div>
        <div className="ep-container ep-hero__foot" data-hero-fade>
          <BookingBar locale={locale} t={t} />
          <a className="ep-scrollcue" href="#philosophy"><i aria-hidden="true" />{t.hero.scroll}</a>
        </div>
      </HeroMotion>

      {/* 2. Statement that lights up with the scroll, and two photographs at different speeds */}
      <section id="philosophy" className="ep-section ep-leafy">
        <Botanical name="branch-gold-a" className="ep-deco--tr" from="right" rotate={14} />
        <Botanical name="olive-a" className="ep-deco--bl ep-deco--sm" from="left" rotate={-10} drift={120} />
        <div className="ep-container ep-intro">
          <p className="mr-eyebrow">{t.philosophy.eyebrow}</p>
          <div className="ep-stack ep-stack--lg">
            <ScrubText text={t.philosophy.text} className="ep-statement ep-statement--wide" />
            <Link className="mr-btn mr-btn--secondary" style={{ justifySelf: "start" }} href={`${base}/villa`}>{t.philosophy.cta}</Link>
          </div>
        </div>
        <div className="ep-container ep-pair" style={{ marginTop: "var(--section)" }}>
          <Frame src={img("outdoor-09")} alt={t.alt.olive} speed={8} label={t.rooms.view} />
          <Frame src={img("outdoor-05")} alt={t.alt.facade} speed={-14} arch />
          <div className="ep-pair__note ep-stack">
            <Title lines={t.brand.mottoA} className="mr-h3" />
          </div>
        </div>
      </section>

      {/* 3. Mottos */}
      <Marquee words={t.mottos} />

      {/* 4. The arch of the logo opens onto the pool */}
      <ArchReveal media={<PoolImage name="outdoor-11" alt={t.alt.poolNight} />} title={<p className="ep-display">{t.pool.lines[0]}<br /><em>{t.pool.lines[1]}</em></p>}>
        <p className="mr-eyebrow">{t.pool.eyebrow}</p>
        <h2 className="mr-h2">{t.pool.lines[0]} <em>{t.pool.lines[1]}</em></h2>
        <p className="mr-lead">{t.pool.text}</p>
      </ArchReveal>

      {/* 5. The two villas */}
      <Ornament />
      <section className="ep-section ep-leafy">
        <Botanical name="olive-c" className="ep-deco--mr" from="right" rotate={12} drift={140} />
        <div className="ep-container ep-stack" style={{ marginBottom: "var(--section)" }}>
          <p className="mr-eyebrow">{t.rooms.eyebrow}</p>
          <Title lines={t.rooms.lines} className="ep-display" />
          <p className="mr-lead mr-muted">{t.rooms.lead}</p>
        </div>
        <div className="ep-container ep-villas">
          {units.map((unit, index) => <VillaBlock key={unit.id} unit={unit} locale={locale} t={t} index={index} reverse={index % 2 === 1} />)}
        </div>
      </section>

      {/* 6. A walk through the estate: vertical scroll moves the photographs sideways */}
      <HorizontalScroll
        label={t.brand.journeyEyebrow}
        head={<>
          <div className="ep-stack"><p className="mr-eyebrow">{t.brand.journeyEyebrow}</p><Title lines={t.brand.journeyLines} /></div>
          <Link className="mr-btn mr-btn--secondary" href={`${base}/gallery`}>{t.nav.gallery}</Link>
        </>}
      >
        {journey.map((shot, index) => (
          <Link className="ep-rcard" key={shot.name} href={`${base}/gallery`} data-cursor={t.rooms.view}>
            <div className="ep-rcard__media"><img src={img(shot.name)} alt={shot.alt} loading="lazy" /><span className="ep-rcard__idx">{String(index + 1).padStart(2, "0")}</span></div>
            <div className="ep-rcard__foot"><h3>{shot.alt}</h3></div>
          </Link>
        ))}
      </HorizontalScroll>

      {/* 7. Outdoor living: scenes that slide over each other */}
      <section className="ep-section ep-leafy">
        <Botanical name="olive-garland" className="ep-deco--tl" from="left" rotate={-8} drift={60} />
        <Botanical name="branch-gold-c" className="ep-deco--tr ep-deco--sm" from="right" rotate={18} drift={60} />
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-motto">
            <p className="mr-eyebrow">{t.living.label}</p>
            <ScrubText text={t.brand.mottoC} />
          </div>
          <Scenes>
            {t.living.steps.map((step, index) => (
              <article className="ep-scene" key={step.title}>
                <img src={img(scenes[index].name)} alt={scenes[index].alt} loading="lazy" />
                <div className="ep-scene__body">
                  <p className="mr-eyebrow">{step.eyebrow}</p>
                  <h3 className="mr-h2">{step.title}</h3>
                  <p className="mr-lead">{step.text}</p>
                </div>
              </article>
            ))}
          </Scenes>
        </div>
      </section>

      {/* 8. The estate in numbers */}
      <section className="ep-section ep-section--inverse mr-on-inverse ep-leafy">
        <Botanical name="branch-gold-a" className="ep-deco--tr ep-deco--sm ep-deco--faint" from="right" rotate={12} drift={40} />
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-stack"><p className="mr-eyebrow">{t.brand.statsEyebrow}</p><Title lines={t.brand.mottoB} /></div>
          <Stagger selector=".ep-facts > div">
            <dl className="ep-facts ep-facts--big">
              {t.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd><CountUp value={Number(fact.value)} /></dd></div>)}
            </dl>
          </Stagger>
        </div>
      </section>

      {/* 9. Discover Corinth */}
      <Ornament sprig="sprig-gold-b" />
      <section className="ep-section ep-leafy">
        <Botanical name="olive-b" className="ep-deco--tr" from="right" rotate={10} drift={100} />
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-stack">
            <p className="mr-eyebrow">{t.explore.eyebrow}</p>
            <Title lines={t.explore.lines} className="ep-display" />
            <p className="mr-lead mr-muted">{t.explore.lead}</p>
          </div>
          {media.get("home.region.video") ? (
            <div className="ep-film">
              <AutoVideo src={media.get("home.region.video")!.url} poster={media.get("home.region.video")!.poster} label={t.places["ancient-corinth"].name} />
              <p className="ep-film__caption"><span className="mr-eyebrow">{t.places["ancient-corinth"].name}</span><span className="mr-editorial">{t.places["ancient-corinth"].tip}</span></p>
            </div>
          ) : null}
          <Stagger className="ep-places" selector=".ep-place">
            {places.slice(0, 6).map((place, index) => (
              <Link className="ep-place" key={place.slug} href={`${base}/explore-corinth#place-${place.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                <span className="ep-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="mr-eyebrow">{t.explore.categories[place.category]}</p>
                  <h3 className="mr-h3">{t.places[place.slug].name}</h3>
                </div>
                <p className="mr-body mr-muted">{t.places[place.slug].summary}</p>
                <img className="ep-place__thumb" src={media.get(`place.${place.slug}.photo`)?.url ?? media.get(`place.${place.slug}.video`)?.poster ?? placeImg(place.slug)} alt="" loading="lazy" />
              </Link>
            ))}
          </Stagger>
          <Link className="mr-btn mr-btn--secondary" style={{ justifySelf: "start" }} href={`${base}/explore-corinth`}>{t.explore.cta}</Link>
          {posts.length ? (
            <div className="ep-stack" style={{ marginTop: "var(--space-12)" }}>
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
        </div>
      </section>

      {/* 10. Reserve */}
      <ParallaxCover id="reserve" media={<PoolImage name="outdoor-10" alt={t.alt.poolView} />}>
        <div className="ep-container ep-cta__body">
          <p className="mr-eyebrow">{t.reserve.eyebrow}</p>
          <Title lines={t.reserve.lines} className="ep-display" />
          <p className="mr-lead">{t.reserve.text}</p>
          <MagneticButton strength={0.4} max={24}><Link className="ep-round" href={`${base}/booking`}>{t.reserve.cta}</Link></MagneticButton>
          <p className="mr-body"><a href={contact.phoneHref} style={{ color: "inherit" }}>{contact.phone}</a></p>
        </div>
      </ParallaxCover>

    </>
  );
}
