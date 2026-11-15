'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { enter, motion, useGsap } from './motion';

export interface SplitTextRevealProps {
  text: string;
  as?: 'p' | 'h2' | 'h3' | 'blockquote';
  /** Type class. Default `mr-lead`. */
  className?: string;
  /** Seconds between words. */
  stagger?: number;
}

export function SplitTextReveal({ text, as: Tag = 'p', className = 'mr-lead', stagger = 0.04 }: SplitTextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(/\s+/).filter(Boolean);
  useGsap(ref, (root, scroller) => {
    gsap.from(root.querySelectorAll('.mr-m-word'), {
      opacity: 0,
      yPercent: 60,
      duration: 0.7,
      ease: motion.textReveal.ease,
      stagger,
      scrollTrigger: enter(root, scroller),
    });
  }, [text, stagger]);
  return (
    <Tag ref={ref as React.Ref<any>} className={className}>
      <span className="mr-sr">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <React.Fragment key={index}><span className="mr-m-word">{word}</span>{' '}</React.Fragment>
        ))}
      </span>
    </Tag>
  );
}
