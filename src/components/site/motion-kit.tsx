"use client";
// Client islands for the public site chrome: smooth scroll, header + full-screen menu, hero, sticky booking bar.
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { MotionProvider, motion, useGsap, useMotion } from "@/components/ds/motion";
import { ScrollProgress } from "@/components/ds/ScrollProgress";

const REDUCE_KEY = "ephyria-reduce-motion";
let lenis: Lenis | null = null;

/** Restores the visitor's manual "reduce motion" choice. */
function RestoreMotionChoice() {
  const { setReduced } = useMotion();
  useEffect(() => {
    try {
      if (localStorage.getItem(REDUCE_KEY) === "1") setReduced(true);
    } catch {}
  }, [setReduced]);
  // CSS-only motion (the water ripple) follows the same switch.
  const { reduced } = useMotion();
  useEffect(() => {
    document.documentElement.classList.toggle("is-still", reduced);
  }, [reduced]);
  return null;
}

/** Inertial scrolling (Lenis) driving ScrollTrigger. Off under reduced motion: the page then scrolls natively. */
function SmoothScroll() {
  const { reduced } = useMotion();
  useEffect(() => {
    if (reduced) return;
    const instance = new Lenis({ lerp: 0.085, anchors: true });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Photographs and web fonts change section heights after first paint.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, [reduced]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <RestoreMotionChoice />
      <SmoothScroll />
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
    lenis?.scrollTo(0, { immediate: true });
    gsap.from(root, { opacity: 0, y: 24, duration: 0.9, ease: "power3.out", clearProps: "opacity,transform", onComplete: () => ScrollTrigger.refresh() });
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

/** Header: logo, language, Book and a Menu button that opens a full-screen navigation. */
export function HeaderShell({ logo, items, book, locale, labels, overHero, media, contact }: {
  logo: React.ReactNode;
  items: NavItem[];
  book: NavItem;
  locale: string;
  labels: { menu: string; close: string; language: string; home: string };
  overHero: string[];
  media: React.ReactNode;
  contact: React.ReactNode;
}) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(el|en|de)(?=\/|$)/, "") || "";
  const transparent = overHero.includes(rest || "/");
  const [scrolled, setScrolled] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const { reduced } = useMotion();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  const open = () => {
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    lenis?.stop();
    if (!reduced) {
      gsap.from(el.querySelectorAll(".ep-overlay__links a"), { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.06, delay: 0.35 });
      gsap.from(el.querySelectorAll("[data-menu-fade]"), { opacity: 0, y: 20, duration: 0.8, ease: motion.textReveal.ease, stagger: 0.08, delay: 0.6 });
    }
  };
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
      <div className="ep-container ep-bar">
        <Link className="ep-logo" href={`/${locale}`} aria-label={`Ephyria Lux, ${labels.home}`}>{logo}</Link>
        <div className="ep-bar__right">
          {langs}
          <Link className="mr-btn" href={book.href}>{book.label}</Link>
          <button type="button" className="ep-burger" aria-haspopup="dialog" onClick={open}>
            <span>{labels.menu}</span><span className="ep-line" aria-hidden="true" />
            <span className="mr-sr">{labels.menu}</span>
          </button>
        </div>
      </div>
      <dialog ref={dialog} className="ep-overlay" aria-label={labels.menu} data-lenis-prevent onClose={() => lenis?.start()}>
        <div className="ep-container ep-overlay__in">
          <div className="ep-bar">
            <Link className="ep-logo" href={`/${locale}`} aria-label={`Ephyria Lux, ${labels.home}`}>{logo}</Link>
            <button type="button" className="ep-burger" onClick={() => dialog.current?.close()}>
              <span style={{ display: "inline" }}>{labels.close}</span><span className="ep-line" aria-hidden="true" />
            </button>
          </div>
          <div className="ep-overlay__grid">
            <nav aria-label={labels.menu}>
              <ul className="ep-overlay__links">
                {[...items, book].map((item) => (
                  <li key={item.href}><Link href={item.href} aria-current={current(item.href)}>{item.label}</Link></li>
                ))}
              </ul>
            </nav>
            <div className="ep-overlay__media" data-menu-fade>{media}</div>
          </div>
          <div className="ep-overlay__foot" data-menu-fade>{contact}{langs}</div>
        </div>
      </dialog>
    </header>
  );
}

/**
 * Hero choreography: the photograph settles from a deep zoom, the headline rises line by line,
 * then the photograph and the text travel at different speeds while the page scrolls.
 */
export function HeroMotion({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root) => {
    const media = root.querySelector(".ep-hero__media");
    const body = root.querySelector(".ep-hero__body");
    // Wait for the intro curtain on a first visit.
    const hasCurtain = Boolean(document.querySelector(".ep-loader")) && !document.documentElement.classList.contains("is-returning");
    const intro = gsap.timeline({ defaults: { ease: "power4.out" }, delay: hasCurtain ? 1.7 : 0.1 });
    intro
      .fromTo(media, { scale: 1.3 }, { scale: 1.08, duration: 2.6, ease: "power3.out" })
      .from(root.querySelectorAll(".mr-m-line > span"), { yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.12 }, 0.2)
      .from(root.querySelectorAll("[data-hero-fade]"), { opacity: 0, y: 24, duration: 1.1, stagger: 0.1 }, 0.8);
    const scrub = { trigger: root, start: "top top", end: "bottom top", scrub: true };
    gsap.to(media, { yPercent: 16, ease: "none", scrollTrigger: scrub });
    if (body) gsap.to(body, { yPercent: -28, opacity: 0, ease: "none", scrollTrigger: scrub });
  });
  return <section ref={ref} id={id} className={`ep-hero ${className}`}>{children}</section>;
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
