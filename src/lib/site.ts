import type { Dict } from "./i18n";

export const contact = { phone: "+30 694 656 4148", phoneHref: "tel:+306946564148", email: "worldwide.act2020@gmail.com" };

/** The villa in Examilia (approximate, for the schematic map and directions links). */
export const villa = { lat: 37.896, lng: 22.928 };

type AltKey = keyof Dict["alt"];
export const img = (name: string) => `/images/${name}.webp`;

/** Every photograph, with its alt key, intrinsic size and gallery category. */
export const photos: { name: string; alt: AltKey; w: number; h: number; cat: keyof Dict["gallery"]["cats"] }[] = [
  { name: "outdoor-08", alt: "poolDusk", w: 1672, h: 941, cat: "outdoor" },
  { name: "outdoor-10", alt: "poolView", w: 1672, h: 941, cat: "outdoor" },
  { name: "outdoor-11", alt: "poolNight", w: 1672, h: 941, cat: "outdoor" },
  { name: "outdoor-01", alt: "poolDay", w: 1798, h: 875, cat: "outdoor" },
  { name: "outdoor-09", alt: "olive", w: 1672, h: 941, cat: "outdoor" },
  { name: "outdoor-07", alt: "facadeDusk", w: 1799, h: 874, cat: "outdoor" },
  { name: "outdoor-02", alt: "facade", w: 1798, h: 875, cat: "outdoor" },
  { name: "outdoor-05", alt: "facade", w: 874, h: 1799, cat: "outdoor" },
  { name: "outdoor-04", alt: "garden", w: 1798, h: 875, cat: "outdoor" },
  { name: "outdoor-06", alt: "entrance", w: 1799, h: 874, cat: "outdoor" },
  { name: "outdoor-03", alt: "bbq", w: 1799, h: 874, cat: "outdoor" },
  { name: "indoor-02", alt: "living", w: 1799, h: 874, cat: "living" },
  { name: "indoor-03", alt: "living", w: 1800, h: 874, cat: "living" },
  { name: "indoor-14", alt: "view", w: 1800, h: 874, cat: "living" },
  { name: "indoor-15", alt: "lounge", w: 1086, h: 1448, cat: "living" },
  { name: "indoor-11", alt: "lounge", w: 874, h: 1800, cat: "living" },
  { name: "indoor-16", alt: "lounge", w: 1086, h: 1448, cat: "living" },
  { name: "indoor-07", alt: "dining", w: 1801, h: 873, cat: "living" },
  { name: "indoor-06", alt: "kitchen", w: 1800, h: 874, cat: "living" },
  { name: "indoor-25", alt: "kitchen", w: 875, h: 1798, cat: "living" },
  { name: "indoor-29-2", alt: "kitchen", w: 874, h: 1800, cat: "living" },
  { name: "indoor-28", alt: "corner", w: 873, h: 1800, cat: "living" },
  { name: "indoor-19", alt: "bedroom", w: 1799, h: 874, cat: "bedrooms" },
  { name: "indoor-21", alt: "bedroom", w: 1800, h: 874, cat: "bedrooms" },
  { name: "indoor-22", alt: "bedroom", w: 1800, h: 874, cat: "bedrooms" },
  { name: "indoor-18", alt: "bedroom", w: 1798, h: 875, cat: "bedrooms" },
  { name: "indoor-17", alt: "bedroom", w: 1798, h: 875, cat: "bedrooms" },
  { name: "indoor-23", alt: "bedroom", w: 874, h: 1800, cat: "bedrooms" },
  { name: "indoor-24", alt: "twin", w: 1800, h: 874, cat: "bedrooms" },
  { name: "indoor-26", alt: "bedroom", w: 1800, h: 874, cat: "bedrooms" },
  { name: "indoor-27", alt: "bedroom", w: 1800, h: 874, cat: "bedrooms" },
  { name: "indoor-08", alt: "bath", w: 874, h: 1799, cat: "bath" },
  { name: "indoor-09", alt: "bath", w: 874, h: 1800, cat: "bath" },
  { name: "indoor-12", alt: "bath", w: 874, h: 1800, cat: "bath" },
  { name: "indoor-13-1", alt: "bath", w: 1086, h: 1448, cat: "bath" },
  { name: "indoor-30", alt: "spa", w: 1798, h: 875, cat: "wellness" },
];

export type UnitSlug = keyof Dict["units"];

/** Photographs shown for each room. shortcut: assigned by eye from the photo set; confirm with the owner which photo belongs to which room. */
export const unitPhotos: Record<UnitSlug, { name: string; alt: AltKey }[]> = {
  a1: [{ name: "indoor-19", alt: "bedroom" }, { name: "indoor-21", alt: "bedroom" }, { name: "indoor-20", alt: "bedroom" }, { name: "indoor-13-1", alt: "bath" }],
  a2: [{ name: "indoor-26", alt: "bedroom" }, { name: "indoor-27", alt: "bedroom" }, { name: "indoor-12", alt: "bath" }],
  a3: [{ name: "indoor-24", alt: "twin" }, { name: "indoor-09", alt: "bath" }, { name: "indoor-08", alt: "bath" }],
  b1: [{ name: "indoor-18", alt: "bedroom" }, { name: "indoor-17", alt: "bedroom" }, { name: "indoor-10", alt: "bath" }],
  b2: [{ name: "indoor-22", alt: "bedroom" }, { name: "indoor-23", alt: "bedroom" }, { name: "indoor-08", alt: "bath" }],
};

export type PlaceSlug = keyof Dict["places"];
export type Category = keyof Dict["explore"]["categories"];

/** The six launch destinations. Coordinates only: distances come from the visitor's own navigation app. */
export const places: { slug: PlaceSlug; category: Category; lat: number; lng: number }[] = [
  { slug: "ancient-corinth", category: "history", lat: 37.906, lng: 22.879 },
  { slug: "acrocorinth", category: "history", lat: 37.8911, lng: 22.8697 },
  { slug: "corinth-canal", category: "nature", lat: 37.9347, lng: 22.9838 },
  { slug: "loutraki", category: "sea", lat: 37.9756, lng: 22.9767 },
  { slug: "nemea", category: "wine", lat: 37.809, lng: 22.71 },
  { slug: "lake-vouliagmeni", category: "sea", lat: 38.0317, lng: 22.875 },
];

export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&origin=${villa.lat},${villa.lng}&destination=${lat},${lng}`;

export const fmt = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
