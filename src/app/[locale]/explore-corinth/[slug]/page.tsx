import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { alternates, getDict, longDate } from "@/lib/i18n";
import { Title } from "@/components/site/fx";
import { Prose } from "@/components/site/parts";

type Props = PageProps<"/[locale]/explore-corinth/[slug]">;

const load = cache((slug: string, locale: string) =>
  db.article.findFirst({ where: { slug, status: "PUBLISHED" }, include: { translations: { where: { locale } } } }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const { locale } = await getDict(raw);
  const text = (await load(slug, locale))?.translations[0];
  return text ? { title: text.metaTitle, description: text.metaDescription, alternates: alternates(`/explore-corinth/${slug}`, locale), openGraph: { type: "article", title: text.metaTitle, description: text.metaDescription } } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const { locale, t } = await getDict(raw);
  const article = await load(slug, locale);
  const text = article?.translations[0];
  if (!article || !text) notFound();
  return (
    <article className="ep-container ep-stack ep-stack--lg" style={{ paddingTop: "calc(72px + var(--section) / 1.6)", paddingBottom: "var(--section)" }}>
      <header className="ep-stack" style={{ maxWidth: 1040 }}>
        <p className="mr-eyebrow"><Link href={`/${locale}/explore-corinth#journal`} style={{ color: "inherit" }}>{t.explore.journal}</Link>{article.publishedAt ? ` / ${longDate(article.publishedAt, locale)}` : ""}</p>
        <Title as="h1" className="mr-h2" lines={[text.title]} />
        <p className="mr-lead mr-muted">{text.excerpt}</p>
      </header>
      <hr className="mr-rule" />
      <Prose markdown={text.body} />
      <div><Link className="mr-btn mr-btn--secondary" href={`/${locale}/explore-corinth#journal`}>{t.explore.back}</Link></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: text.title, description: text.metaDescription, inLanguage: locale, datePublished: article.publishedAt, publisher: { "@type": "Organization", name: "Ephyria Lux" } }).replace(/</g, "\\u003c") }} />
    </article>
  );
}
