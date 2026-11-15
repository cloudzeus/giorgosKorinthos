'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { enter, motion, useGsap } from './motion';

export interface ImageMaskRevealProps {
  src: string;
  alt: string;
  /** CSS aspect-ratio. Default `4 / 5`. */
  ratio?: string;
  className?: string;
}

export function ImageMaskReveal({ src, alt, ratio = '4 / 5', className = '' }: ImageMaskRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root, scroller) => {
    const tween = { duration: motion.imageReveal.duration, ease: motion.imageReveal.ease };
    gsap.timeline({ scrollTrigger: enter(root, scroller) })
      .fromTo(root, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ...tween })
      .fromTo(root.querySelector('img'), { scale: 1.06 }, { scale: 1, ...tween }, 0);
  }, [src]);
  return (
    <div ref={ref} className={`mr-m-media ${className}`} style={{ aspectRatio: ratio }}>
      <img src={src} alt={alt} />
    </div>
  );
}
