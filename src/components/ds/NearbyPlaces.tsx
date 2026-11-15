'use client';
import React from 'react';
import type { Place } from './destinations';

export interface NearbyPlacesProps {
  title: string;
  /** Already sorted by distance from the villa. Four to six rows. */
  places: Place[];
}

export function NearbyPlaces({ title, places }: NearbyPlacesProps) {
  return (
    <section className="mr-nearby">
      <h3 className="mr-eyebrow">{title}</h3>
      <ul className="mr-nearby__list">
        {places.map((place) => {
          const body = (
            <>
              <span className="mr-nearby__name">{place.name}</span>
              <span className="mr-nearby__kind">{place.categoryLabel}</span>
              {place.distance ? <span className="mr-tag">{place.distance}</span> : null}
            </>
          );
          return (
            <li key={place.id}>
              {place.href ? <a className="mr-nearby__row" href={place.href}>{body}</a> : <div className="mr-nearby__row">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
