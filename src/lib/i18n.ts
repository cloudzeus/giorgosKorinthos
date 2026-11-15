import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "./db";
import en from "@/i18n/en";
import el from "@/i18n/el";
import de from "@/i18n/de";

export const locales = ["el", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "el";
export type Dict = typeof en;

const dictionaries: Record<Locale, Dict> = { el, en, de };

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Built-in texts, without CMS overrides. For code that must not wait on the database. */
export const baseDict = (locale: Locale): Dict => dictionaries[locale];

/** Every text of a dictionary as "dot.path" -> string. Arrays use their index: "hero.lines.0". */
export function flatten(value: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof value === "string") out[prefix] = value;
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

/** A copy of the dictionary with the overrides applied. Unknown or non-text paths are ignored. */
export function applyOverrides(dict: Dict, overrides: { key: string; value: string }[]): Dict {
  if (!overrides.length) return dict;
  const copy = structuredClone(dict) as Record<string, unknown>;
  for (const { key, value } of overrides) {
    const path = key.split(".");
    let node: unknown = copy;
    for (const part of path.slice(0, -1)) node = node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
    const last = path[path.length - 1];
    if (node && typeof node === "object" && typeof (node as Record<string, unknown>)[last] === "string") (node as Record<string, unknown>)[last] = value;
  }
  return copy as Dict;
}

const overridesFor = cache((locale: Locale) => db.contentBlock.findMany({ where: { locale }, select: { key: true, value: true } }));

/** Narrow the route param and load its texts (built-in dictionary + CMS overrides), or 404. */
export async function getDict(locale: string): Promise<{ locale: Locale; t: Dict }> {
  if (!isLocale(locale)) notFound();
  return { locale, t: applyOverrides(dictionaries[locale], await overridesFor(locale)) };
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
