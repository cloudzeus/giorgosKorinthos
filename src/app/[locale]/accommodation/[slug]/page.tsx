import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { alternates, getDict, money } from "@/lib/i18n";
import { fmt, img, unitPhotos, type UnitSlug } from "@/lib/site";
import { AnimatedHeading } from "@/components/ds/AnimatedHeading";
import { ImageMaskReveal } from "@/components/ds/ImageMaskReveal";
import { HorizontalImageGallery } from "@/components/ds/HorizontalImageGallery";

type Props = PageProps<"/[locale]/accommodation/[slug]">;

const load = (slug: string) => db.unit.findFirst({ where: { slug, active: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const { locale, t } = getDict(raw);
  const copy = t.units[slug as UnitSlug];
  return copy ? { title: copy.name, description: copy.text, alternates: alternates(`/accommodation/${slug}`, locale) } : {};
}

export default async function RoomPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const { locale, t } = getDict(raw);
  const unit = await load(slug);
  const copy = t.units[slug as UnitSlug];
  const shots = unitPhotos[slug as UnitSlug];
  if (!unit || !copy || !shots) notFound();
  const building = unit.building === "A" ? t.rooms.buildingA : t.rooms.buildingB;
  return (
    <>
      <section className="ep-container ep-grid" style={{ paddingTop: "calc(72px + var(--space-12))", paddingBottom: "var(--section)", alignItems: "end" }}>
        <div className="ep-stack" style={{ gridColumn: "1 / -1" }}>
          <p className="mr-eyebrow"><Link href={`/${locale}/accommodation`} style={{ color: "inherit" }}>{t.nav.rooms}</Link> / {building}</p>
          <AnimatedHeading as="h1" className="mr-h1" lines={[copy.name]} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <ImageMaskReveal src={img(shots[0].name)} alt={t.alt[shots[0].alt]} ratio="2 / 1" />
        </div>
      </section>
      <section className="ep-container ep-book" style={{ paddingBottom: "var(--section)" }}>
        <div className="ep-stack ep-stack--lg">
          <p className="mr-lead">{copy.text}</p>
          <dl className="ep-facts" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div><dt>{t.rooms.bedsLabel}</dt><dd style={{ fontSize: "var(--fs-20)", lineHeight: 1.4 }}>{copy.beds}</dd></div>
            <div><dt>{building}</dt><dd>{fmt(t.rooms.sleeps, { n: unit.capacity })}</dd></div>
          </dl>
          <div className="ep-stack">
            <h2 className="mr-h3">{t.rooms.includedTitle}</h2>
            <ul className="ep-list">{t.rooms.included.map((item) => <li key={item}><Check aria-hidden="true" strokeWidth={1.5} /><span>{item}</span></li>)}</ul>
          </div>
        </div>
        <aside className="ep-panel ep-book__aside">
          <p className="mr-eyebrow">{t.rooms.from}</p>
          <p className="mr-h2" style={{ fontVariantNumeric: "tabular-nums" }}>{money(unit.priceCents, locale)} <span className="mr-tag">{t.rooms.perNight}</span></p>
          <Link className="mr-btn" href={`/${locale}/booking`}>{t.rooms.book}</Link>
        </aside>
      </section>
      <section className="ep-section ep-section--alt">
        <div className="ep-container">
          <HorizontalImageGallery label={t.rooms.galleryLabel} previousLabel={t.gallery.prev} nextLabel={t.gallery.next} images={shots.map((shot) => ({ src: img(shot.name), alt: t.alt[shot.alt] }))} />
        </div>
      </section>
    </>
  );
}
