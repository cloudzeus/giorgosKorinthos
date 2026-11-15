'use client';
import React from 'react';
import type { Place } from './destinations';

export interface DestinationCardProps {
  place: Place;
  /** Link label, in the page language. Default "Discover". */
  linkLabel?: string;
  /** Marks the card as the one selected on the map. */
  selected?: boolean;
  /** Called when the card is hovered or focused, to highlight its marker. */
  onSelect?: (id: string) => void;
  /** CSS aspect-ratio of the photograph. Default `4 / 5`. */
  ratio?: string;
}

export function DestinationCard({ place, linkLabel = 'Discover', selected = false, onSelect, ratio = '4 / 5' }: DestinationCardProps) {
  const meta = [place.duration, place.distance].filter(Boolean);
  const select = onSelect ? () => onSelect(place.id) : undefined;
  return (
    <article className={`mr-dest${selected ? ' is-selected' : ''}`} onMouseEnter={select} onFocus={select}>
      <div className="mr-m-media mr-dest__media" style={{ aspectRatio: ratio }}>
        {place.src ? <img src={place.src} alt={place.alt || ''} loading="lazy" /> : null}
      </div>
      <p className="mr-eyebrow">{place.categoryLabel}</p>
      <h3 className="mr-h3">{place.name}</h3>
      <p className="mr-dest__text">{place.summary}</p>
      {meta.length ? (
        <ul className="mr-dest__meta">{meta.map((item) => <li className="mr-tag" key={item}>{item}</li>)}</ul>
      ) : null}
      {place.href ? (
        <a className="mr-btn mr-btn--link" href={place.href}>
          {linkLabel}<span className="mr-sr">: {place.name}</span>
        </a>
      ) : null}
    </article>
  );
}
