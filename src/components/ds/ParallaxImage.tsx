'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGsap } from './motion';

export interface ParallaxImageProps {
  src: string;
  alt: string;
  /** CSS aspect-ratio. Default `16 / 9`. */
  ratio?: string;
  /** Travel as a percentage of the image height, 0 to 10. */
  amount?: number;
  className?: string;
}

export function ParallaxImage({ src, alt, ratio = '16 / 9', amount = 8, className = '' }: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const travel = Math.max(0, Math.min(10, amount));
  useGsap(ref, (root, scroller) => {
    gsap.fromTo(root.querySelector('img'), { yPercent: -travel }, {
      yPercent: travel,
      ease: 'none',
      scrollTrigger: { trigger: root, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }, [src, travel]);
  return (
    <div ref={ref} className={`mr-m-media mr-m-parallax ${className}`} style={{ aspectRatio: ratio }}>
      <img src={src} alt={alt} />
    </div>
  );
}
