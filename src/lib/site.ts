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

/** Photographs shown for each villa. shortcut: assigned by eye from the photo set; confirm with the owner which photo belongs to which villa. */
export const unitPhotos: Record<UnitSlug, { name: string; alt: AltKey }[]> = {
  a: [{ name: "indoor-19", alt: "bedroom" }, { name: "indoor-02", alt: "living" }, { name: "indoor-21", alt: "bedroom" }, { name: "indoor-26", alt: "bedroom" }, { name: "indoor-24", alt: "twin" }, { name: "indoor-06", alt: "kitchen" }, { name: "indoor-13-1", alt: "bath" }],
  b: [{ name: "indoor-18", alt: "bedroom" }, { name: "indoor-15", alt: "lounge" }, { name: "indoor-17", alt: "bedroom" }, { name: "indoor-22", alt: "bedroom" }, { name: "indoor-25", alt: "kitchen" }, { name: "indoor-10", alt: "bath" }],
};

export type PlaceSlug = keyof Dict["places"];
export type Category = keyof Dict["explore"]["categories"];

/** Our recommendations around the villa, ordered roughly by distance. Coordinates only: routes come from the visitor's navigation app. */
export const places: { slug: PlaceSlug; category: Category; lat: number; lng: number }[] = [
  { slug: "ancient-corinth", category: "history", lat: 37.906, lng: 22.879 },
  { slug: "acrocorinth", category: "history", lat: 37.8911, lng: 22.8697 },
  { slug: "corinth-canal", category: "nature", lat: 37.9347, lng: 22.9838 },
  { slug: "isthmia", category: "history", lat: 37.9157, lng: 22.993 },
  { slug: "kenchreai", category: "sea", lat: 37.8847, lng: 22.993 },
  { slug: "lechaion", category: "history", lat: 37.933, lng: 22.887 },
  { slug: "loutraki", category: "sea", lat: 37.9756, lng: 22.9767 },
  { slug: "heraion", category: "history", lat: 38.0283, lng: 22.852 },
  { slug: "lake-vouliagmeni", category: "sea", lat: 38.0317, lng: 22.875 },
  { slug: "nemea", category: "wine", lat: 37.809, lng: 22.71 },
  { slug: "mycenae", category: "history", lat: 37.7308, lng: 22.7561 },
  { slug: "stymphalia", category: "nature", lat: 37.853, lng: 22.46 },
];

export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&origin=${villa.lat},${villa.lng}&destination=${lat},${lng}`;

export const fmt = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/** Water surface of each pool photograph, as a polygon in percent of the image. Drives the ripple overlay. */
export const pools: Record<string, { w: number; h: number; water: [number, number][] }> = {
  "outdoor-08": { w: 1672, h: 941, water: [[27, 83.5], [48, 76.5], [100, 74.5], [100, 84], [70, 92], [29, 87]] },
  "outdoor-10": { w: 1672, h: 941, water: [[10, 58], [61, 58], [93, 65.5], [60, 84], [31, 74], [6, 62.5]] },
  "outdoor-11": { w: 1672, h: 941, water: [[42.5, 41], [63.5, 41], [99, 88], [99, 94.5], [6, 94.5]] },
  "outdoor-01": { w: 1798, h: 875, water: [[38, 30.5], [60, 30.5], [98, 61], [99, 77], [6, 77], [6, 71]] },
};

/** Photographs of the places, from Wikimedia Commons. Each is shown with its author and licence, as the licences require. */
export const placePhotos: Record<PlaceSlug, { author: string; license: string; licenseUrl: string; source: string }> = {
  "ancient-corinth": { author: "Berthold Werner", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:Korinth_BW_2017-10-10_10-50-32.jpg" },
  "acrocorinth": { author: "Nicolas von Kospoth (Triggerhappy)", license: "CC BY-SA 2.5", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.5/", source: "https://commons.wikimedia.org/wiki/File:Acrocorinth_Gateway.jpg" },
  "corinth-canal": { author: "evievaki1234", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:Corinth_Canal,_Greece-17Feb2012.jpg" },
  "isthmia": { author: "Zde", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Archaeological_site_of_Isthmia,_Roman_Baths,_202745.jpg" },
  "kenchreai": { author: "Carole Raddato", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/wiki/File:Temple_of_Isis_at_the_southwest_side_of_the_ancient_harbour_at_Kenchreai,_one_of_the_two_ports_of_the_inland_city-state_of_Corinth,_Greece_(14082672584).jpg" },
  "loutraki": { author: "Cliff Seiber", license: "Public domain", licenseUrl: "", source: "https://commons.wikimedia.org/wiki/File:Loutraki_beach_promenade.JPG" },
  "heraion": { author: "Donarreiskoffer", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Heraion_of_Perachora,_Greece_06.jpg" },
  "lake-vouliagmeni": { author: "Charski A.V.", license: "Public domain", licenseUrl: "", source: "https://commons.wikimedia.org/wiki/File:Vouliagmeni,_Corinth.jpg" },
  "nemea": { author: "Zde", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Temple_of_Nemean_Zeus,_330_BC,_201754.jpg" },
  "mycenae": { author: "Zde", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Lion_Gate,_Mycenae,_201507.jpg" },
  "stymphalia": { author: "Nojos88", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:%CE%9B%CE%AF%CE%BC%CE%BD%CE%B7_%CE%A3%CF%84%CF%85%CE%BC%CF%86%CE%B1%CE%BB%CE%AF%CE%B1%CF%82_6.jpg" },
  "lechaion": { author: "Schuppi", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Korakou_(Corinth)_7.JPG" },
};
export const placeImg = (slug: PlaceSlug) => `/images/places/${slug}.webp`;
