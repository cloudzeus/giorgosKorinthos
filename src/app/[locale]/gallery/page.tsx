import type { Metadata } from "next";
import { alternates, getDict } from "@/lib/i18n";
import { img, photos } from "@/lib/site";
import { GalleryGrid } from "@/components/site/islands";
import { PageIntro } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.nav.gallery, description: t.gallery.lead, alternates: alternates("/gallery", locale) };
}

export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  const { t } = await getDict((await params).locale);
  const cats = Object.keys(t.gallery.cats) as (keyof typeof t.gallery.cats)[];
  return (
    <>
      <PageIntro eyebrow={t.gallery.eyebrow} lines={t.gallery.lines} lead={t.gallery.lead} />
      {cats.map((cat) => (
        <section className="ep-container ep-stack" key={cat} style={{ paddingBottom: "var(--section)" }} aria-labelledby={`cat-${cat}`}>
          <h2 className="mr-h3" id={`cat-${cat}`}>{t.gallery.cats[cat]}</h2>
          <GalleryGrid
            labels={{ prev: t.gallery.prev, next: t.gallery.next, close: t.gallery.close, open: t.gallery.open }}
            photos={photos.filter((photo) => photo.cat === cat).map((photo) => ({ src: img(photo.name), alt: t.alt[photo.alt], w: photo.w, h: photo.h, group: cat }))}
          />
        </section>
      ))}
    </>
  );
}
