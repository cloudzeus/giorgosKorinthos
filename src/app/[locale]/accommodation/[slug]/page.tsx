import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, Check } from "lucide-react";
import { db } from "@/lib/db";
import { alternates, getDict, money } from "@/lib/i18n";
import { img, unitPhotos, type UnitSlug } from "@/lib/site";
import { Frame, HorizontalScroll, Title } from "@/components/site/fx";
import { PageHero } from "@/components/site/parts";

type Props = PageProps<"/[locale]/accommodation/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const { locale, t } = await getDict(raw);
  const copy = t.units[slug as UnitSlug];
  return copy ? { title: copy.name, description: copy.text, alternates: alternates(`/accommodation/${slug}`, locale) } : {};
}

export default async function VillaDetailPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const { locale, t } = await getDict(raw);
  const unit = await db.unit.findFirst({ where: { slug, active: true } });
  const copy = t.units[slug as UnitSlug];
  const shots = unitPhotos[slug as UnitSlug];
  if (!unit || !copy || !shots) notFound();
  return (
    <>
      <PageHero src={img(shots[0].name)} alt={t.alt[shots[0].alt]} eyebrow={t.rooms.eyebrow.replace(/^\d+ \/ /, "")} lines={[copy.name]} lead={copy.text} />
      <section className="ep-section">
        <div className="ep-container ep-book">
          <div className="ep-stack ep-stack--lg">
            <dl className="ep-specs">
              <div><dt>{t.rooms.bedsLabel}</dt><dd>{copy.rooms.length}</dd></div>
              <div><dt>{t.booking.guests}</dt><dd>{unit.capacity}</dd></div>
              <div><dt>{t.rooms.from} / {t.rooms.perNight}</dt><dd>{money(unit.priceCents, locale)}</dd></div>
            </dl>
            <div className="ep-stack">
              <Title lines={[t.rooms.bedsLabel]} className="mr-h2" />
              <ul className="ep-list">{copy.rooms.map((room) => <li key={room}><BedDouble aria-hidden="true" strokeWidth={1.5} /><span>{room}</span></li>)}</ul>
            </div>
            <div className="ep-stack">
              <h2 className="mr-h3">{t.rooms.includedTitle}</h2>
              <ul className="ep-list">{t.rooms.included.map((item) => <li key={item}><Check aria-hidden="true" strokeWidth={1.5} /><span>{item}</span></li>)}</ul>
            </div>
          </div>
          <aside className="ep-stack ep-book__aside">
            <Frame src={img(shots[1].name)} alt={t.alt[shots[1].alt]} arch className="ep-villa__main" />
            <div className="ep-panel">
              <p className="mr-eyebrow">{t.rooms.from}</p>
              <p className="mr-h2" style={{ fontVariantNumeric: "tabular-nums" }}>{money(unit.priceCents, locale)} <span className="mr-tag">{t.rooms.perNight}</span></p>
              <Link className="mr-btn" href={`/${locale}/booking`}>{t.rooms.book}</Link>
            </div>
          </aside>
        </div>
      </section>
      <HorizontalScroll label={t.rooms.galleryLabel} head={<><div className="ep-stack"><p className="mr-eyebrow">{t.nav.gallery}</p><Title lines={[copy.name]} /></div><Link className="mr-btn mr-btn--secondary" href={`/${locale}/accommodation`}>{t.rooms.all}</Link></>}>
        {shots.map((shot, index) => (
          <div className="ep-rcard" key={shot.name}>
            <div className="ep-rcard__media"><img src={img(shot.name)} alt={t.alt[shot.alt]} loading="lazy" /><span className="ep-rcard__idx">{String(index + 1).padStart(2, "0")}</span></div>
            <div className="ep-rcard__foot"><h3>{t.alt[shot.alt]}</h3></div>
          </div>
        ))}
      </HorizontalScroll>
    </>
  );
}
