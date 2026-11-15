'use client';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/** Motion tokens: the middle of each range in tokens.json `duration`, with its `easing`. */
export const motion = {
  micro: { duration: 0.2, ease: 'power2.out' },
  textReveal: { duration: 0.9, ease: 'power3.out' },
  imageReveal: { duration: 1.2, ease: 'power2.inOut' },
  section: { duration: 1, ease: 'power3.inOut' },
  hero: { duration: 1.6, ease: 'power3.out' },
} as const;

export type Scroller = string | Element | null;

interface MotionState {
  reduced: boolean;
  setReduced: (value: boolean | null) => void;
  scroller: Scroller;
}

const MotionContext = createContext<MotionState>({ reduced: false, setReduced: () => {}, scroller: null });

/** Read the reduced-motion state, or set the visitor's manual choice (null = follow the system). */
export const useMotion = () => useContext(MotionContext);

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface MotionProviderProps {
  children: React.ReactNode;
  /** Force reduced motion on or off. Leave undefined to follow the system and the visitor's choice. */
  reduceMotion?: boolean;
  /** Scroll container for every scroll-driven child. Selector or element. Default: the window. */
  scroller?: Scroller;
}

export function MotionProvider({ children, reduceMotion, scroller = null }: MotionProviderProps) {
  const [system, setSystem] = useState(false);
  const [manual, setManual] = useState<boolean | null>(null);
  useIsoLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystem(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  const reduced = reduceMotion ?? manual ?? system;
  const value = useMemo(() => ({ reduced, setReduced: setManual, scroller }), [reduced, scroller]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function resolveScroller(scroller: Scroller): Element | undefined {
  if (!scroller) return undefined;
  return (typeof scroller === 'string' ? document.querySelector(scroller) : scroller) || undefined;
}

/**
 * Run a GSAP setup scoped to `ref`, reverted on unmount.
 * Skipped entirely under reduced motion, so content stays in its final state.
 */
export function useGsap(
  ref: React.RefObject<HTMLElement | null>,
  build: (root: HTMLElement, scroller: Element | undefined) => void,
  deps: unknown[] = [],
) {
  const { reduced, scroller } = useMotion();
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (reduced || !root) return;
    const context = gsap.context(() => build(root, resolveScroller(scroller)), root);
    return () => context.revert();
  }, [reduced, scroller, ...deps]);
}

/** The shared "play once when it enters the viewport" trigger. */
export const enter = (trigger: Element, scroller: Element | undefined) => ({
  trigger,
  scroller,
  start: 'top 85%',
  once: true,
});
