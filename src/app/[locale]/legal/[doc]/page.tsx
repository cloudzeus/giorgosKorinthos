import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alternates, getDict, longDate } from "@/lib/i18n";
import { CONSENT_UI, DOCS, LEGAL, UPDATED, type Doc } from "@/lib/legal";
import { PageIntro, Prose } from "@/components/site/parts";

const isDoc = (value: string): value is Doc => (DOCS as readonly string[]).includes(value);

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">): Promise<Metadata> {
  const { locale: raw, doc } = await params;
  const { locale } = await getDict(raw);
  if (!isDoc(doc)) return {};
  return { title: LEGAL[locale][doc].title, description: LEGAL[locale][doc].lead, alternates: alternates(`/legal/${doc}`, locale) };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale: raw, doc } = await params;
  const { locale, t } = await getDict(raw);
  if (!isDoc(doc)) notFound();
  const page = LEGAL[locale][doc];
  return (
    <>
      <PageIntro eyebrow="Ephyria Lux" lines={[page.title]} lead={page.lead} />
      <section className="ep-container ep-stack ep-stack--lg" style={{ paddingBottom: "var(--section)" }}>
        <Prose markdown={page.body.replace(/\n+/g, "\n\n")} />
        <p className="mr-hint">{CONSENT_UI[locale].updated}: {longDate(new Date(`${UPDATED}T00:00:00Z`), locale)}</p>
        <nav className="ep-legalnav" aria-label={t.footer.explore}>
          {DOCS.filter((other) => other !== doc).map((other) => <Link key={other} className="mr-btn mr-btn--secondary" href={`/${locale}/legal/${other}`}>{LEGAL[locale][other].title}</Link>)}
        </nav>
      </section>
    </>
  );
}
