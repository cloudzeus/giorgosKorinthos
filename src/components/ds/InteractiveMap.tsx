'use client';
import React from 'react';
import type { Place } from './destinations';

export interface InteractiveMapProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Accessible name, e.g. "Map of destinations around Corinth". */
  label: string;
  /** The villa, drawn as the origin marker. */
  origin?: { name: string; lat: number; lng: number };
  /**
   * The real map from the maps provider (Mapbox, Google, Leaflet), rendered behind the markers' list.
   * Without it the component draws a schematic plot from the coordinates.
   */
  map?: React.ReactNode;
  /** CSS aspect-ratio of the map area. Default `4 / 3`. */
  ratio?: string;
}

export function InteractiveMap({ places, selectedId, onSelect, label, origin, map, ratio = '4 / 3' }: InteractiveMapProps) {
  const points = origin ? [...places, origin] : places;
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const south = Math.min(...lats), north = Math.max(...lats);
  const west = Math.min(...lngs), east = Math.max(...lngs);
  // Equirectangular plot with a 12% inset, enough at this scale to keep relative positions.
  const x = (lng: number) => 12 + ((lng - west) / (east - west || 1)) * 76;
  const y = (lat: number) => 88 - ((lat - south) / (north - south || 1)) * 76;
  return (
    <section className="mr-map" aria-label={label}>
      <div className="mr-map__canvas" style={{ aspectRatio: ratio }}>
        {map || (
          <ol className="mr-map__plot">
            {places.map((place, index) => (
              <li key={place.id} style={{ left: `${x(place.lng)}%`, top: `${y(place.lat)}%` }}>
                <button
                  type="button"
                  className="mr-map__marker"
                  aria-pressed={selectedId === place.id}
                  aria-label={`${index + 1}. ${place.name}`}
                  onClick={() => onSelect(place.id)}
                >
                  <span aria-hidden="true">{index + 1}</span>
                </button>
              </li>
            ))}
            {origin ? (
              <li className="mr-map__origin" style={{ left: `${x(origin.lng)}%`, top: `${y(origin.lat)}%` }}>
                <span className="mr-tag">{origin.name}</span>
              </li>
            ) : null}
          </ol>
        )}
      </div>
      <ol className="mr-map__list">
        {places.map((place, index) => (
          <li key={place.id}>
            <button type="button" className="mr-map__row" aria-pressed={selectedId === place.id} onClick={() => onSelect(place.id)}>
              <span className="mr-map__index" aria-hidden="true">{index + 1}</span>
              <span className="mr-map__name">{place.name}</span>
              <span className="mr-tag">{place.distance || place.categoryLabel}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
