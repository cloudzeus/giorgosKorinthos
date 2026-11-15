"use client";
// Interactive pieces of the gallery and of Explore Corinth.
import React, { useEffect, useRef, useState } from "react";
import { ExperienceFilter } from "@/components/ds/ExperienceFilter";
import "maplibre-gl/dist/maplibre-gl.css";
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
  tip: string;
}

const PAPER = "#F6F3ED", WATER = "#BFCBC6", LAND = "#EAE5DA", ROAD = "#D8CFBF", INK = "#555C50";

/**
 * Our own map of the region: OpenStreetMap vector tiles (OpenFreeMap, no key) repainted in the brand palette,
 * with numbered markers. If the tiles cannot load, the numbered list beside it still carries everything.
 */
function RegionMap({ places, origin, selected, onSelect, label }: {
  places: PlaceRow[]; origin: { name: string; lat: number; lng: number }; selected: string | null; onSelect: (id: string) => void; label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const key = places.map((place) => place.id).join(",");
  useEffect(() => {
    let cancelled = false;
    let created: import("maplibre-gl").Map | undefined;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      // The bundler cannot emit the library's module worker, so it is served from /public (copied on install).
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const instance = (created = new maplibre.Map({ container: box.current, style: "https://tiles.openfreemap.org/styles/positron", center: [origin.lng, origin.lat], zoom: 9.5, cooperativeGestures: true, attributionControl: { compact: true } }));
      map.current = instance;
      instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
      instance.on("style.load", () => {
        for (const layer of instance.getStyle().layers ?? []) {
          const paint = (property: string, value: string) => { try { instance.setPaintProperty(layer.id, property as "fill-color", value); } catch {} };
          if (layer.type === "background") paint("background-color", PAPER);
          else if (layer.type === "fill") paint("fill-color", /water/.test(layer.id) ? WATER : LAND);
          else if (layer.type === "line") paint("line-color", /water/.test(layer.id) ? WATER : ROAD);
          else if (layer.type === "symbol") {
            if (/poi|shield|housenumber/.test(layer.id)) { try { instance.setLayoutProperty(layer.id, "visibility", "none"); } catch {} } else paint("text-color", INK);
          }
        }
      });
      const bounds = new maplibre.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
      markers.current.clear();
      places.forEach((place, index) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "ep-pin";
        el.textContent = String(index + 1);
        el.setAttribute("aria-label", `${index + 1}. ${place.name}`);
        el.addEventListener("click", () => onSelect(place.id));
        markers.current.set(place.id, el);
        new maplibre.Marker({ element: el }).setLngLat([place.lng, place.lat]).addTo(instance);
        bounds.extend([place.lng, place.lat]);
      });
      const home = document.createElement("span");
      home.className = "ep-pin ep-pin--home";
      home.textContent = origin.name;
      new maplibre.Marker({ element: home }).setLngLat([origin.lng, origin.lat]).addTo(instance);
      instance.fitBounds(bounds, { padding: 64, duration: 0 });
    })().catch(() => {});
    return () => { cancelled = true; created?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    markers.current.forEach((el, id) => el.classList.toggle("is-on", id === selected));
    const place = places.find((item) => item.id === selected);
    if (place) map.current?.flyTo({ center: [place.lng, place.lat], zoom: 11.5, duration: 1400 });
  }, [selected, places]);
  return <div ref={box} className="ep-map" role="region" aria-label={label} />;
}

/** Destination concierge: category filter, our map and the list of recommendations, sharing one selection. */
export function ExploreConcierge({ places, categories, labels, origin }: {
  places: PlaceRow[];
  categories: { id: string; label: string }[];
  labels: { filter: string; all: string; map: string; directions: string; visit: string; tip: string };
  origin: { name: string; lat: number; lng: number };
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const shown = category ? places.filter((place) => place.category === category) : places;
  return (
    <div className="ep-stack ep-stack--lg">
      <ExperienceFilter categories={categories} value={category} onChange={(value) => { setCategory(value); setSelected(null); }} label={labels.filter} allLabel={labels.all} />
      <div className="ep-guide">
        <div className="ep-guide__map"><RegionMap places={shown} origin={origin} selected={selected} onSelect={(id) => { setSelected(id); document.getElementById(`place-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }} label={labels.map} /></div>
        <ol className="ep-guide__list">
          {shown.map((place, i) => (
            <li key={place.id} id={`place-${place.id}`} className={`ep-rec${selected === place.id ? " is-selected" : ""}`}>
              <button type="button" className="ep-rec__head" aria-pressed={selected === place.id} onClick={() => setSelected(place.id)}>
                <span className="ep-number">{String(i + 1).padStart(2, "0")} / {place.categoryLabel}</span>
                <span className="ep-rec__name">{place.name}</span>
              </button>
              <p className="mr-body mr-muted">{place.summary}</p>
              <p className="ep-rec__tip"><strong>{labels.tip}</strong>{place.tip}</p>
              <div className="ep-rec__foot">
                <span className="mr-tag">{labels.visit}: {place.visit}</span>
                <a className="mr-btn mr-btn--link" href={place.directions} target="_blank" rel="noopener noreferrer">{labels.directions}<span className="mr-sr">: {place.name}</span></a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
