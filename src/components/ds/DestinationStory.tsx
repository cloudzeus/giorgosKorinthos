'use client';
import React from 'react';
import { AnimatedHeading } from './AnimatedHeading';
import { FadeInSection } from './FadeInSection';
import { ImageMaskReveal } from './ImageMaskReveal';

export interface StoryFact {
  label: string;
  value: string;
}

export interface DestinationStoryProps {
  eyebrow?: string;
  /** One string per line of the heading. */
  title: string[];
  paragraphs: string[];
  src: string;
  alt: string;
  /** Short facts under the text: visit length, route, season. */
  facts?: StoryFact[];
  /** Put the photograph on the left. Alternate from story to story. */
  reverse?: boolean;
  /** CSS aspect-ratio of the photograph. Default `4 / 5`. */
  ratio?: string;
  children?: React.ReactNode;
}

export function DestinationStory({ eyebrow, title, paragraphs, src, alt, facts = [], reverse = false, ratio = '4 / 5', children }: DestinationStoryProps) {
  return (
    <section className={`mr-dstory${reverse ? ' mr-dstory--reverse' : ''}`}>
      <div className="mr-dstory__text">
        {eyebrow ? <p className="mr-eyebrow">{eyebrow}</p> : null}
        <AnimatedHeading as="h2" lines={title} />
        <FadeInSection as="div" className="mr-dstory__body">
          {paragraphs.map((paragraph, index) => (
            <p className={index ? 'mr-body mr-muted' : 'mr-lead'} key={index}>{paragraph}</p>
          ))}
          {facts.length ? (
            <dl className="mr-dstory__facts">
              {facts.map((fact) => (
                <div key={fact.label}><dt className="mr-tag">{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          ) : null}
          {children}
        </FadeInSection>
      </div>
      <ImageMaskReveal src={src} alt={alt} ratio={ratio} className="mr-dstory__media" />
    </section>
  );
}
