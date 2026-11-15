import type { Metadata } from "next";
import Link from "next/link";
import { alternates, getDict } from "@/lib/i18n";
import { img } from "@/lib/site";
import { DestinationStory } from "@/components/ds/DestinationStory";
import { HorizontalImageGallery } from "@/components/ds/HorizontalImageGallery";
import { CountUp, Marquee, ParallaxCover, ScrubText, Stagger, Title } from "@/components/site/fx";
import { PageHero, PoolImage } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/villa">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return { title: t.nav.villa, description: t.villa.lead, alternates: alternates("/villa", locale) };
}

export default async function VillaPage({ params }: PageProps<"/[locale]/villa">) {
  const { locale, t } = getDict((await params).locale);
  const media = [
    { src: img("indoor-02"), alt: t.alt.living },
    { src: img("indoor-06"), alt: t.alt.kitchen },
    { src: img("indoor-14"), alt: t.alt.view },
  ];
  const strip = ["outdoor-02", "outdoor-05", "outdoor-07", "outdoor-06", "outdoor-04", "outdoor-01"] as const;
  const stripAlt = [t.alt.facade, t.alt.facade, t.alt.facadeDusk, t.alt.entrance, t.alt.garden, t.alt.poolDay];
  return (
    <>
      <PageHero src={img("outdoor-07")} alt={t.alt.facadeDusk} eyebrow={t.villa.eyebrow} lines={t.villa.lines} lead={t.villa.lead} />
      <div className="ep-section">
        <div className="ep-container ep-stack" style={{ gap: "var(--section)" }}>
          {t.villa.sections.map((section, index) => (
            <DestinationStory key={section.title} eyebrow={section.eyebrow} title={[section.title]} paragraphs={[section.text]} src={media[index].src} alt={media[index].alt} reverse={index % 2 === 1} ratio="4 / 3" />
          ))}
        </div>
      </div>
      <section className="ep-section ep-section--alt">
        <div className="ep-container ep-stack ep-stack--lg">
          <HorizontalImageGallery label={t.nav.gallery} previousLabel={t.gallery.prev} nextLabel={t.gallery.next} images={strip.map((name, index) => ({ src: img(name), alt: stripAlt[index] }))} />
          <Link className="mr-btn mr-btn--secondary" style={{ justifySelf: "start" }} href={`/${locale}/gallery`}>{t.nav.gallery}</Link>
        </div>
      </section>
      <Marquee words={t.mottos} />
      <ParallaxCover media={<PoolImage name="outdoor-10" alt={t.alt.poolView} />}>
        <div className="ep-container ep-cta__body">
          <p className="mr-eyebrow">{t.experiences.eyebrow}</p>
          <Title lines={[t.villa.playTitle]} className="ep-display" />
          <p className="mr-lead">{t.villa.playText}</p>
          <Link className="mr-btn mr-btn--inverse" href={`/${locale}/experiences`}>{t.nav.experiences}</Link>
        </div>
      </ParallaxCover>
      <section className="ep-section">
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-motto"><ScrubText text={t.brand.mottoC} /></div>
          <Stagger selector=".ep-facts > div">
            <dl className="ep-facts">{t.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd><CountUp value={Number(fact.value)} /></dd></div>)}</dl>
          </Stagger>
        </div>
      </section>
    </>
  );
}
