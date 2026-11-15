"use client";
// Interactive pieces of the gallery and of Explore Corinth.
import React, { useEffect, useRef, useState } from "react";
import { ExperienceFilter } from "@/components/ds/ExperienceFilter";
import { InteractiveMap } from "@/components/ds/InteractiveMap";
import type { Place } from "@/components/ds/destinations";

export interface LightboxPhoto {
  src: string;
  alt: string;
  w: number;
  h: number;
  group: string;
}

/** Photo grid with a full-screen viewer: arrows, Escape, swipe. Without JS each photo is a plain link. */
export function GalleryGrid({ photos, labels }: { photos: LightboxPhoto[]; labels: { prev: string; next: string; close: string; open: string } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const touch = useRef(0);
  const step = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (index !== null && !el.open) el.showModal();
    if (index === null && el.open) el.close();
    // Preload the next photograph.
    if (index !== null) new Image().src = photos[(index + 1) % photos.length].src;
  }, [index, photos]);
  const active = index === null ? null : photos[index];
  return (
    <>
      <div className="ep-gallery">
        {photos.map((photo, i) => (
          <a key={photo.src} href={photo.src} aria-label={`${labels.open}: ${photo.alt}`} onClick={(event) => { event.preventDefault(); setIndex(i); }}>
            <img src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} loading={i > 3 ? "lazy" : undefined} />
          </a>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="ep-lightbox"
        aria-label={active?.alt}
        onClose={() => setIndex(null)}
        onKeyDown={(event) => { if (event.key === "ArrowRight") step(1); if (event.key === "ArrowLeft") step(-1); }}
        onTouchStart={(event) => { touch.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => { const dx = event.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1); }}
      >
        {active ? (
          <div className="ep-lightbox__in">
            <div className="ep-lightbox__bar">
              <span className="mr-tag" style={{ color: "inherit" }}>{index! + 1} / {photos.length}</span>
              <button type="button" className="mr-btn" onClick={() => setIndex(null)}>{labels.close}</button>
            </div>
            <img src={active.src} alt={active.alt} />
            <div className="ep-lightbox__bar">
              <button type="button" className="mr-btn" aria-label={labels.prev} onClick={() => step(-1)}><span aria-hidden="true">&larr;</span></button>
              <span>{active.alt}</span>
              <button type="button" className="mr-btn" aria-label={labels.next} onClick={() => step(1)}><span aria-hidden="true">&rarr;</span></button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

export interface PlaceRow extends Place {
  visit: string;
  directions: string;
}

/** Destination concierge: category filter, schematic map and the list, all sharing one selection. */
export function ExploreConcierge({ places, categories, labels, origin }: {
  places: PlaceRow[];
  categories: { id: string; label: string }[];
  labels: { filter: string; all: string; map: string; directions: string; visit: string };
  origin: { name: string; lat: number; lng: number };
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const shown = category ? places.filter((place) => place.category === category) : places;
  const select = (id: string) => {
    setSelected(id);
    document.getElementById(`place-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return (
    <div className="ep-stack ep-stack--lg">
      <ExperienceFilter categories={categories} value={category} onChange={(value) => { setCategory(value); setSelected(null); }} label={labels.filter} allLabel={labels.all} />
      <InteractiveMap places={shown} selectedId={selected} onSelect={select} label={labels.map} origin={origin} />
      <div className="ep-places">
        {shown.map((place, i) => (
          <article key={place.id} id={`place-${place.id}`} className={`ep-place${selected === place.id ? " is-selected" : ""}`} onMouseEnter={() => setSelected(place.id)}>
            <span className="ep-number">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="mr-eyebrow">{place.categoryLabel}</p>
              <h3 className="mr-h3">{place.name}</h3>
            </div>
            <p className="mr-body mr-muted">{place.summary}</p>
            <div className="ep-stack" style={{ gap: "var(--space-2)" }}>
              <p className="mr-tag">{labels.visit}: {place.visit}</p>
              <a className="mr-btn mr-btn--link" style={{ justifySelf: "start" }} href={place.directions} target="_blank" rel="noopener noreferrer">
                {labels.directions}<span className="mr-sr">: {place.name}</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
