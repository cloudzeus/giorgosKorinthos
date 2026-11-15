'use client';
import React from 'react';

export interface ItineraryStop {
  /** Time of day or step label: "09:30", "Morning". */
  time: string;
  name: string;
  text: string;
  /** Visit length or route to the next stop, already formatted. */
  note?: string;
}

export interface ItineraryTimelineProps {
  title: string;
  /** One line under the title: who the day is for, total length. */
  summary?: string;
  stops: ItineraryStop[];
}

export function ItineraryTimeline({ title, summary, stops }: ItineraryTimelineProps) {
  return (
    <section className="mr-itin">
      <h3 className="mr-h3">{title}</h3>
      {summary ? <p className="mr-body mr-muted">{summary}</p> : null}
      <ol className="mr-itin__stops">
        {stops.map((stop, index) => (
          <li key={index}>
            <p className="mr-eyebrow">{stop.time}</p>
            <h4 className="mr-itin__name">{stop.name}</h4>
            <p className="mr-itin__text">{stop.text}</p>
            {stop.note ? <p className="mr-tag">{stop.note}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
