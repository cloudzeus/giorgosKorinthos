import type { Metadata } from "next";
import { db } from "@/lib/db";
import { alternates, getDict } from "@/lib/i18n";
import { FadeInSection } from "@/components/ds/FadeInSection";
import { PageIntro, RoomCard } from "@/components/site/parts";
import { Check } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/[locale]/accommodation">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return { title: t.nav.rooms, description: t.rooms.lead, alternates: alternates("/accommodation", locale) };
}

export default async function AccommodationPage({ params }: PageProps<"/[locale]/accommodation">) {
  const { locale, t } = getDict((await params).locale);
  const units = await db.unit.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  return (
    <>
      <PageIntro eyebrow={t.rooms.eyebrow.replace(/^\d+ \/ /, "")} lines={t.rooms.lines} lead={t.rooms.lead} />
      <section className="ep-container" style={{ paddingBottom: "var(--section)" }}>
        <div className="ep-rooms">
          {units.map((unit, index) => (
            <FadeInSection as="div" key={unit.id}><RoomCard unit={unit} locale={locale} t={t} wide={index % 4 === 0 || index % 4 === 3} /></FadeInSection>
          ))}
        </div>
      </section>
      <section className="ep-section ep-section--alt">
        <div className="ep-container ep-stack" style={{ maxWidth: 880 }}>
          <h2 className="mr-h2">{t.rooms.includedTitle}</h2>
          <ul className="ep-list">{t.rooms.included.map((item) => <li key={item}><Check aria-hidden="true" strokeWidth={1.5} /><span>{item}</span></li>)}</ul>
        </div>
      </section>
    </>
  );
}
