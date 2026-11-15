'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { motion, useMotion } from './motion';

export interface MagneticButtonProps {
  /** One button or link, e.g. `<a className="mr-btn">`. */
  children: React.ReactElement;
  /** Share of the pointer offset the child follows, 0 to 0.5. */
  strength?: number;
  /** Largest travel in px. */
  max?: number;
}

export function MagneticButton({ children, strength = 0.3, max = 10 }: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduced } = useMotion();
  const clamp = (value: number) => Math.max(-max, Math.min(max, value));
  const follow = (event: React.PointerEvent<HTMLSpanElement>) => {
    const root = ref.current;
    if (reduced || !root || event.pointerType !== 'mouse') return;
    const box = root.getBoundingClientRect();
    gsap.to(root.firstElementChild, {
      x: clamp((event.clientX - box.left - box.width / 2) * strength),
      y: clamp((event.clientY - box.top - box.height / 2) * strength),
      duration: motion.micro.duration,
      ease: motion.micro.ease,
      overwrite: true,
    });
  };
  const release = () => {
    const root = ref.current;
    if (!root) return;
    gsap.to(root.firstElementChild, { x: 0, y: 0, duration: 0.25, ease: motion.micro.ease, overwrite: true });
  };
  return (
    <span ref={ref} className="mr-m-magnetic" onPointerMove={follow} onPointerLeave={release}>
      {children}
    </span>
  );
}
