'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGsap } from './motion';

export interface ScrollProgressProps {
  /** `fixed` to the viewport top, or `sticky` inside a scroll container. */
  position?: 'fixed' | 'sticky';
  className?: string;
}

export function ScrollProgress({ position = 'fixed', className = '' }: ScrollProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root, scroller) => {
    gsap.fromTo(root.firstElementChild, { scaleX: 0 }, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { scroller, start: 0, end: 'max', scrub: true },
    });
  });
  return (
    <div ref={ref} className={`mr-m-progress ${className}`} style={{ position }} aria-hidden="true">
      <span />
    </div>
  );
}
