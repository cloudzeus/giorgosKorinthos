'use client';
import React from 'react';
import { useMotion } from './motion';

export interface ReducedMotionFallbackProps {
  /** Shown when motion is allowed. */
  children: React.ReactNode;
  /** Shown under reduced motion: a still image for a video, a list for a pinned story. */
  fallback?: React.ReactNode;
}

export function ReducedMotionFallback({ children, fallback = null }: ReducedMotionFallbackProps) {
  const { reduced } = useMotion();
  return <>{reduced ? fallback : children}</>;
}
