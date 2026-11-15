'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { enter, motion, useGsap } from './motion';

export interface FadeInSectionProps {
  children: React.ReactNode;
  as?: 'section' | 'div' | 'article' | 'header' | 'footer';
  className?: string;
  /** Vertical travel in px. */
  y?: number;
}

export function FadeInSection({ children, as: Tag = 'section', className, y = 24 }: FadeInSectionProps) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root, scroller) => {
    gsap.from(root, {
      opacity: 0,
      y,
      duration: motion.section.duration,
      ease: motion.section.ease,
      scrollTrigger: enter(root, scroller),
    });
  }, [y]);
  return <Tag ref={ref as React.Ref<any>} className={className}>{children}</Tag>;
}
