'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { enter, motion, useGsap } from './motion';

export interface AnimatedHeadingProps {
  /** One string per line. Lines rise one after another. */
  lines: string[];
  as?: 'h1' | 'h2' | 'h3';
  /** Type class. Default `mr-h2`. */
  className?: string;
  /** Seconds before the first line starts. */
  delay?: number;
}

export function AnimatedHeading({ lines, as: Tag = 'h2', className = 'mr-h2', delay = 0 }: AnimatedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGsap(ref, (root, scroller) => {
    gsap.from(root.querySelectorAll('.mr-m-line > span'), {
      yPercent: 110,
      duration: motion.textReveal.duration,
      ease: motion.textReveal.ease,
      stagger: 0.12,
      delay,
      scrollTrigger: enter(root, scroller),
    });
  }, [lines.join('\n'), delay]);
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, index) => (
        <span className="mr-m-line" key={index}><span>{line}</span></span>
      ))}
    </Tag>
  );
}
