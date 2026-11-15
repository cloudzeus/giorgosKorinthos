'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGsap } from './motion';

export interface ParallaxSectionProps {
  src: string;
  /** Leave empty when the photograph is decorative behind the text. */
  alt?: string;
  children: React.ReactNode;
  /** CSS min-height. Default `100vh`. */
  minHeight?: string;
  className?: string;
}

export function ParallaxSection({ src, alt = '', children, minHeight = '100vh', className = '' }: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root, scroller) => {
    gsap.fromTo(root.querySelector('.mr-m-psection__media'), { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: root, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }, [src]);
  return (
    <section ref={ref} className={`mr-m-psection mr-on-inverse ${className}`} style={{ minHeight }}>
      <img className="mr-m-psection__media" src={src} alt={alt} />
      <div className="mr-m-psection__body">{children}</div>
    </section>
  );
}
