import type { Metadata } from "next";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { alternates, getDict } from "@/lib/i18n";
import { Botanical, Marquee, Ornament } from "@/components/site/fx";
import { PageIntro, VillaBlock } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/accommodation">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.nav.rooms, description: t.rooms.lead, alternates: alternates("/accommodation", locale) };
}

export default async function AccommodationPage({ params }: PageProps<"/[locale]/accommodation">) {
  const { locale, t } = await getDict((await params).locale);
  const units = await db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  return (
    <>
      <PageIntro eyebrow={t.rooms.eyebrow.replace(/^\d+ \/ /, "")} lines={t.rooms.lines} lead={t.rooms.lead} />
      <section className="ep-leafy" style={{ paddingBlock: "var(--space-12) var(--section)" }}>
        <Botanical name="olive-c" className="ep-deco--mr" from="right" rotate={12} drift={140} />
        <div className="ep-container ep-villas">
        {units.map((unit, index) => <VillaBlock key={unit.id} unit={unit} locale={locale} t={t} index={index} reverse={index % 2 === 1} />)}
        </div>
      </section>
      <Marquee words={t.mottos} />
      <Ornament />
      <section className="ep-section ep-leafy">
        <Botanical name="olive-garland" className="ep-deco--tr" from="right" rotate={8} />
        <div className="ep-container ep-stack" style={{ maxWidth: 880 }}>
          <h2 className="mr-h2">{t.rooms.includedTitle}</h2>
          <ul className="ep-list">{t.rooms.included.map((item) => <li key={item}><Check aria-hidden="true" strokeWidth={1.5} /><span>{item}</span></li>)}</ul>
        </div>
      </section>
    </>
  );
}
