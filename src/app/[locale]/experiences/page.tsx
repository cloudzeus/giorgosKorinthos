import type { Metadata } from "next";
import { Check } from "lucide-react";
import { alternates, getDict } from "@/lib/i18n";
import { img } from "@/lib/site";
import { ParallaxImage } from "@/components/ds/ParallaxImage";
import { Stagger } from "@/components/site/fx";
import { PageIntro, PoolImage } from "@/components/site/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/experiences">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return { title: t.nav.experiences, description: t.experiences.lead, alternates: alternates("/experiences", locale) };
}

export default async function ExperiencesPage({ params }: PageProps<"/[locale]/experiences">) {
  const { t } = getDict((await params).locale);
  return (
    <>
      <PageIntro eyebrow={t.experiences.eyebrow} lines={t.experiences.lines} lead={t.experiences.lead} />
      <div className="ep-container"><PoolImage name="outdoor-01" alt={t.alt.poolDay} className="ep-pool--band" /></div>
      <section className="ep-section">
        <div className="ep-container">
          <Stagger className="ep-cols">
            {t.experiences.groups.map((group) => (
              <div className="ep-stack" key={group.title}>
                <h2 className="mr-h3">{group.title}</h2>
                <ul className="ep-list">{group.items.map((item) => <li key={item}><Check aria-hidden="true" strokeWidth={1.5} /><span>{item}</span></li>)}</ul>
              </div>
            ))}
          </Stagger>
        </div>
      </section>
      <div className="ep-container ep-cols ep-cols--2" style={{ paddingBottom: "var(--section)" }}>
        <ParallaxImage src={img("indoor-30")} alt={t.alt.spa} ratio="4 / 3" amount={8} />
        <ParallaxImage src={img("outdoor-03")} alt={t.alt.bbq} ratio="4 / 3" amount={4} />
      </div>
    </>
  );
}
