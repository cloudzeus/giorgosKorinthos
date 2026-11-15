import { db } from "./db";
import { places } from "./site";

/** Places on the site that take their picture or film from the media library. */
export const SLOTS: { id: string; label: string }[] = [
  { id: "home.region.video", label: "Αρχική: βίντεο στην ενότητα «Γνωρίστε την Κόρινθο»" },
  { id: "explore.hero.video", label: "Γνωρίστε την Κόρινθο: βίντεο κεφαλίδας" },
  ...places.flatMap((place) => [
    { id: `place.${place.slug}.photo`, label: `Πρόταση «${place.slug}»: φωτογραφία` },
    { id: `place.${place.slug}.video`, label: `Πρόταση «${place.slug}»: βίντεο` },
  ]),
];

export const isSlot = (value: string) => SLOTS.some((slot) => slot.id === value);

/** All assigned assets, keyed by slot. One query per page. */
export async function slotMap() {
  const rows = await db.mediaAsset.findMany({ where: { slot: { not: null } } });
  return new Map(rows.map((row) => [row.slot!, row]));
}
