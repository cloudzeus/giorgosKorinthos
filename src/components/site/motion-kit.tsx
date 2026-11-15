"use client";
// Client islands for the public site. Everything else renders on the server.
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { MotionProvider, motion, useGsap, useMotion } from "@/components/ds/motion";
import { ScrollProgress } from "@/components/ds/ScrollProgress";

const REDUCE_KEY = "ephyria-reduce-motion";

/** Restores the visitor's manual "reduce motion" choice. */
function RestoreMotionChoice() {
  const { setReduced } = useMotion();
  useEffect(() => {
    try {
      if (localStorage.getItem(REDUCE_KEY) === "1") setReduced(true);
    } catch {}
  }, [setReduced]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <RestoreMotionChoice />
      <ScrollProgress />
      {children}
    </MotionProvider>
  );
}

/**
 * Fades the page content in after a navigation. Skips the first load, so the server-rendered page is
 * never hidden behind an animation, and wraps only <main>: a transform here would break the fixed header.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useGsap(ref, (root) => {
    if (first.current) {
      first.current = false;
      return;
    }
    gsap.from(root, { opacity: 0, y: 12, duration: 0.8, ease: motion.section.ease, clearProps: "opacity,transform" });
  }, [pathname]);
  return <div ref={ref}>{children}</div>;
}

/** Manual switch for motion (WCAG 2.2.2), on top of prefers-reduced-motion. */
export function MotionToggle({ offLabel, onLabel }: { offLabel: string; onLabel: string }) {
  const { reduced, setReduced } = useMotion();
  const toggle = () => {
    const next = !reduced;
    setReduced(next);
    try {
      localStorage.setItem(REDUCE_KEY, next ? "1" : "0");
    } catch {}
  };
  return (
    <button type="button" className="ep-linkbtn" aria-pressed={reduced} onClick={toggle}>
      {reduced ? onLabel : offLabel}
    </button>
  );
}

export interface NavItem {
  href: string;
  label: string;
}

/** Header: transparent over a hero photograph, solid once the page scrolls. */
export function HeaderShell({ logo, items, book, locale, labels, overHero }: {
  logo: React.ReactNode;
  items: NavItem[];
  book: NavItem;
  locale: string;
  labels: { menu: string; language: string; home: string };
  overHero: string[];
}) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(el|en|de)(?=\/|$)/, "") || "";
  const transparent = overHero.includes(rest || "/");
  const [scrolled, setScrolled] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);
  const langs = (
    <ul className="ep-lang" aria-label={labels.language}>
      {["el", "en", "de"].map((code) => (
        <li key={code}>
          <Link href={`/${code}${rest}`} hrefLang={code} lang={code} aria-current={code === locale ? "true" : undefined}>{code}</Link>
        </li>
      ))}
    </ul>
  );
  return (
    <header className={`ep-header${scrolled || !transparent ? " is-solid" : ""}`}>
      <div className="ep-container ep-header__bar">
        <Link className="ep-logo" href={`/${locale}`} aria-label={`Ephyria Lux, ${labels.home}`}>{logo}</Link>
        <nav aria-label={labels.menu} className="ep-header__desk">
          <ul className="ep-nav">
            {items.map((item) => (
              <li key={item.href}><Link href={item.href} aria-current={current(item.href)}>{item.label}</Link></li>
            ))}
            <li>{langs}</li>
            <li><Link className="mr-btn" href={book.href}>{book.label}</Link></li>
          </ul>
        </nav>
        <details className="ep-menu" ref={menu}>
          <summary aria-label={labels.menu}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
          </summary>
          <nav className="ep-menu__panel" aria-label={labels.menu}>
            {items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(item.href)}>{item.label}</Link>
            ))}
            {langs}
            <Link className="mr-btn" href={book.href}>{book.label}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

/**
 * Hero choreography: the photograph settles from 1.06 to 1, the headline lines rise one after another,
 * then the photograph and the text drift at different speeds while the page scrolls (parallax).
 */
export function HeroMotion({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root) => {
    const media = root.querySelector(".ep-hero__media");
    const body = root.querySelector(".ep-hero__body");
    const intro = gsap.timeline({ defaults: { ease: motion.hero.ease } });
    intro
      .fromTo(media, { scale: 1.06 }, { scale: 1, duration: 2 })
      .from(root.querySelectorAll(".mr-m-line > span"), { yPercent: 110, duration: 1.2, stagger: 0.14 }, 0.3)
      .from(root.querySelectorAll("[data-hero-fade]"), { opacity: 0, y: 16, duration: 1, stagger: 0.12 }, 0.7);
    const scrub = { trigger: root, start: "top top", end: "bottom top", scrub: true };
    gsap.to(media, { yPercent: 9, ease: "none", scrollTrigger: scrub });
    if (body) gsap.to(body, { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: scrub });
  });
  return <section ref={ref} id={id} className={`ep-hero ${className}`}>{children}</section>;
}

/** A layer that drifts against the scroll. Positive `amount` moves it slower than the page, negative faster. */
export function Drift({ children, amount = 60, className = "" }: { children: React.ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root) => {
    gsap.fromTo(root, { y: amount }, { y: -amount, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } });
  }, [amount]);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Items rise one after another when the group enters the viewport. */
export function Stagger({ children, className = "", selector = ":scope > *" }: { children: React.ReactNode; className?: string; selector?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root) => {
    gsap.from(root.querySelectorAll(selector), {
      opacity: 0, y: 28, duration: motion.textReveal.duration, ease: motion.textReveal.ease, stagger: 0.08,
      scrollTrigger: { trigger: root, start: "top 85%", once: true },
    });
  });
  return <div ref={ref} className={className}>{children}</div>;
}

/** Booking bar that stays at the bottom once the visitor has scrolled past the hero. */
export function StickyBook({ title, sub, href, cta }: { title: string; sub: string; href: string; cta: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero");
    const stop = document.getElementById("reserve");
    if (!hero) return;
    const seen = new Map<Element, boolean>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
      setOn(!seen.get(hero) && !(stop && seen.get(stop)));
    });
    observer.observe(hero);
    if (stop) observer.observe(stop);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    document.body.classList.toggle("has-sticky", on);
    return () => document.body.classList.remove("has-sticky");
  }, [on]);
  return (
    <div className={`ep-sticky${on ? " is-on" : ""}`} inert={!on}>
      <div className="ep-container ep-sticky__in">
        <p><strong>{title}</strong>{sub}</p>
        <Link className="mr-btn mr-btn--inverse" href={href}>{cta}</Link>
      </div>
    </div>
  );
}
