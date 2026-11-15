import { notFound } from "next/navigation";
import en from "@/i18n/en";
import el from "@/i18n/el";
import de from "@/i18n/de";

export const locales = ["el", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "el";
export type Dict = typeof en;

const dictionaries: Record<Locale, Dict> = { el, en, de };

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Narrow the route param and load its dictionary, or 404. */
export function getDict(locale: string): { locale: Locale; t: Dict } {
  if (!isLocale(locale)) notFound();
  return { locale, t: dictionaries[locale] };
}

export const intlLocale: Record<Locale, string> = { el: "el-GR", en: "en-GB", de: "de-DE" };

export const money = (cents: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

export const longDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);

/** hreflang alternates for a path without the locale prefix, e.g. "/villa". */
export function alternates(path: string, locale: Locale) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    canonical: `${base}/${locale}${path}`,
    languages: { ...Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])), "x-default": `${base}/${defaultLocale}${path}` },
  };
}
