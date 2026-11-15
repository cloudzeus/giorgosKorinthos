import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { alternates, getDict, longDate } from "@/lib/i18n";
import { directionsUrl, img, places, villa } from "@/lib/site";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline";
import { Marquee, Title } from "@/components/site/fx";
import { ExploreConcierge } from "@/components/site/islands";
import { PageHero } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/explore-corinth">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return { title: t.nav.explore, description: t.explore.pageLead, alternates: alternates("/explore-corinth", locale) };
}

export default async function ExplorePage({ params }: PageProps<"/[locale]/explore-corinth">) {
  const { locale, t } = getDict((await params).locale);
  const posts = await db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 30, include: { translations: { where: { locale } } } });
  const rows = places.map((place) => ({
    id: place.slug,
    name: t.places[place.slug].name,
    summary: t.places[place.slug].summary,
    category: place.category,
    categoryLabel: t.explore.categories[place.category],
    lat: place.lat,
    lng: place.lng,
    visit: t.places[place.slug].duration,
    tip: t.places[place.slug].tip,
    directions: directionsUrl(place.lat, place.lng),
  }));
  const used = new Set(places.map((place) => place.category));
  const categories = (Object.keys(t.explore.categories) as (keyof typeof t.explore.categories)[]).filter((id) => used.has(id)).map((id) => ({ id, label: t.explore.categories[id] }));
  return (
    <>
      <PageHero src={img("outdoor-04")} alt={t.alt.garden} eyebrow={t.explore.eyebrow.replace(/^\d+ \/ /, "")} lines={t.explore.lines} lead={t.explore.pageLead} />
      <section className="ep-section">
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-stack"><p className="mr-eyebrow">{t.brand.tipLabel}</p><Title lines={t.brand.guideTitle} className="ep-display" /></div>
          <ExploreConcierge
            places={rows}
            categories={categories}
            origin={{ name: t.explore.origin, ...villa }}
            labels={{ filter: t.explore.filterLabel, all: t.explore.all, map: t.explore.mapLabel, directions: t.explore.directions, visit: t.explore.visit, tip: t.brand.tipLabel }}
          />
        </div>
      </section>
      <Marquee words={places.map((place) => t.places[place.slug].name)} />
      <section className="ep-section ep-section--alt">
        <div className="ep-container"><ItineraryTimeline title={t.explore.itinerary.title} summary={t.explore.itinerary.summary} stops={t.explore.itinerary.stops} /></div>
      </section>
      <section className="ep-section" id="journal">
        <div className="ep-container ep-stack ep-stack--lg">
          <div className="ep-stack">
            <p className="mr-eyebrow">{t.explore.journal}</p>
            <Title lines={[t.explore.journalLead]} />
          </div>
          {posts.length ? (
            <div className="ep-journal">
              {posts.map((post) => post.translations[0] ? (
                <Link className="ep-post" key={post.id} href={`/${locale}/explore-corinth/${post.slug}`}>
                  <span className="mr-tag">{post.publishedAt ? longDate(post.publishedAt, locale) : ""}</span>
                  <h3 className="mr-h3">{post.translations[0].title}</h3>
                  <p className="mr-body mr-muted">{post.translations[0].excerpt}</p>
                  <span className="mr-btn mr-btn--link" style={{ justifySelf: "start" }}>{t.explore.read}</span>
                </Link>
              ) : null)}
            </div>
          ) : <p className="mr-lead mr-muted">{t.explore.noPosts}</p>}
        </div>
      </section>
    </>
  );
}
