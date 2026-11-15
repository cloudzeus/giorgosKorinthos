'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { resolveScroller, useIsoLayoutEffect, useMotion } from './motion';

export interface StoryStep {
  eyebrow?: string;
  title: string;
  text: string;
  src: string;
  alt: string;
}

export interface PinnedStorySectionProps {
  /** Two to four steps. More slows navigation. */
  steps: StoryStep[];
  /** Height of the pinned stage. Default `100vh`. */
  height?: string;
  /** Accessible name of the section. */
  label: string;
  className?: string;
}

export function PinnedStorySection({ steps, height = '100vh', label, className = '' }: PinnedStorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { reduced, scroller } = useMotion();
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (reduced || !root || steps.length < 2) return;
    const media = gsap.matchMedia();
    // Pinned only from tablet up. Phones and reduced motion get the stacked layout.
    media.add('(min-width: 768px)', () => {
      root.classList.add('is-pinned');
      const items = gsap.utils.toArray<HTMLElement>('.mr-m-story__step', root);
      gsap.set(items.slice(1), { autoAlpha: 0 });
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          scroller: resolveScroller(scroller),
          start: 'top top',
          end: () => '+=' + root.offsetHeight * (items.length - 1),
          pin: true,
          scrub: 0.5,
        },
      });
      items.forEach((item, index) => {
        if (!index) return;
        timeline
          .to(items[index - 1], { autoAlpha: 0, duration: 0.4, ease: 'none' }, index - 0.7)
          .to(item, { autoAlpha: 1, duration: 0.4, ease: 'none' }, index - 0.4);
      });
      timeline.to({}, { duration: 0.3 });
      return () => {
        root.classList.remove('is-pinned');
        gsap.set(items, { clearProps: 'all' });
      };
    });
    return () => media.revert();
  }, [reduced, scroller, steps.length]);
  return (
    <section ref={ref} className={`mr-m-story ${className}`} aria-label={label} style={{ ['--mr-story-height' as any]: height }}>
      {steps.map((step, index) => (
        <article className="mr-m-story__step" key={index}>
          <div className="mr-m-story__text">
            {step.eyebrow ? <p className="mr-eyebrow">{step.eyebrow}</p> : null}
            <h3 className="mr-h2">{step.title}</h3>
            <p className="mr-body mr-muted">{step.text}</p>
          </div>
          <div className="mr-m-media mr-m-story__media"><img src={step.src} alt={step.alt} /></div>
        </article>
      ))}
    </section>
  );
}
