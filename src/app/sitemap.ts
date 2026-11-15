import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { locales } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [units, articles] = await Promise.all([
    db.unit.findMany({ where: { active: true }, select: { slug: true } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, publishedAt: true } }),
  ]);
  const paths = ["", "/villa", "/accommodation", "/experiences", "/explore-corinth", "/gallery", "/contact",
    ...units.map((unit) => `/accommodation/${unit.slug}`), ...articles.map((article) => `/explore-corinth/${article.slug}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
