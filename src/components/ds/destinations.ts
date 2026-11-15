/** One destination, as the CMS stores it (Place + PlaceTranslation for the current locale). */
export interface Place {
  id: string;
  name: string;
  /** Category id, matching an ExperienceFilter category. */
  category: string;
  /** Category label in the page language. */
  categoryLabel: string;
  summary: string;
  lat: number;
  lng: number;
  /** Suggested visit length, already formatted: "2 hours". */
  duration?: string;
  /** Estimated route from the villa, already formatted: "15 min by car". From the routing provider. */
  distance?: string;
  src?: string;
  alt?: string;
  /** Link to the destination story or to external navigation. */
  href?: string;
}
