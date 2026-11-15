'use client';
import React, { useRef } from 'react';
import { useMotion } from './motion';

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface HorizontalImageGalleryProps {
  images: GalleryImage[];
  /** Accessible name, e.g. "Bedroom photographs". */
  label: string;
  /** Height of the photographs. Default `clamp(240px, 50vh, 560px)`. */
  height?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

export function HorizontalImageGallery({
  images,
  label,
  height = 'clamp(240px, 50vh, 560px)',
  previousLabel = 'Previous photograph',
  nextLabel = 'Next photograph',
  className = '',
}: HorizontalImageGalleryProps) {
  const track = useRef<HTMLUListElement>(null);
  const { reduced } = useMotion();
  const move = (direction: 1 | -1) => {
    const list = track.current;
    if (!list) return;
    list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <section className={`mr-m-gallery ${className}`} aria-roledescription="carousel" aria-label={label}>
      <ul ref={track} className="mr-m-gallery__track" tabIndex={0} style={{ ['--mr-gallery-height' as any]: height }}>
        {images.map((image, index) => (
          <li key={index}>
            <figure>
              <img src={image.src} alt={image.alt} loading={index > 1 ? 'lazy' : undefined} />
              {image.caption ? <figcaption className="mr-tag">{image.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
      <div className="mr-m-gallery__nav">
        <button type="button" className="mr-btn mr-btn--secondary" aria-label={previousLabel} onClick={() => move(-1)}>
          <span aria-hidden="true">&larr;</span>
        </button>
        <button type="button" className="mr-btn mr-btn--secondary" aria-label={nextLabel} onClick={() => move(1)}>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>
  );
}
