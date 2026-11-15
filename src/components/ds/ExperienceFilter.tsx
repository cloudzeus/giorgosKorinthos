'use client';
import React from 'react';

export interface ExperienceCategory {
  id: string;
  label: string;
}

export interface ExperienceFilterProps {
  categories: ExperienceCategory[];
  /** Selected category id, or null for all. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Accessible name of the group, e.g. "Filter destinations". */
  label: string;
  /** Label of the "all" option. Default "All". */
  allLabel?: string;
}

export function ExperienceFilter({ categories, value, onChange, label, allLabel = 'All' }: ExperienceFilterProps) {
  const options: { id: string | null; label: string }[] = [{ id: null, label: allLabel }, ...categories];
  return (
    <div className="mr-filter" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.id ?? 'all'}
          className="mr-filter__option"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
