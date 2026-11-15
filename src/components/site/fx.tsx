"use client";
// Scroll-driven components. Each one renders its final, readable state on the server;
// GSAP only adds the journey, and useGsap skips it entirely under reduced motion.
import React, { useRef } from "react";
import gsap from "gsap";
import { useGsap, useMotion } from "@/components/ds/motion";

/** Heading whose lines rise from behind a mask. The last line is set in italic, the brand's accent. */
export function Title({ lines, as: Tag = "h2", className = "mr-h2", accent = true }: { lines: string[]; as?: "h1" | "h2" | "h3"; className?: string; accent?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGsap(ref, (root) => {
    gsap.from(root.querySelectorAll(".mr-m-line > span"), {
      yPercent: 115, rotate: 3, duration: 1.3, ease: "power4.out", stagger: 0.12,
      scrollTrigger: { trigger: root, start: "top 88%", once: true },
    });
  }, [lines.join("|")]);
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, index) => (
        <span className="mr-m-line" key={index}>
          <span>{accent && lines.length > 1 && index === lines.length - 1 ? <em>{line}</em> : line}</span>
        </span>
      ))}
    </Tag>
  );
}

/** Paragraph whose words go from faint to full as it crosses the viewport. */
export function ScrubText({ text, className = "ep-statement" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGsap(ref, (root) => {
    gsap.fromTo(root.querySelectorAll("span"), { opacity: 0.14 }, {
      opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: root, start: "top 82%", end: "bottom 48%", scrub: true },
    });
  }, [text]);
  return (
    <p ref={ref} className={className}>
      {text.split(/\s+/).map((word, index) => <React.Fragment key={index}><span>{word}</span>{" "}</React.Fragment>)}
    </p>
  );
}

/** Photograph in a frame: it unveils from the bottom, then keeps drifting inside the frame while scrolling. */
export function Frame({ src, alt, className = "", speed = 12, arch, label, priority }: {
  src: string; alt: string; className?: string; speed?: number; arch?: boolean; label?: string; priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root) => {
    const image = root.querySelector("img");
    gsap.fromTo(root, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power4.inOut", scrollTrigger: { trigger: root, start: "top 90%", once: true } });
    gsap.fromTo(image, { yPercent: -speed, scale: 1.12 }, { yPercent: speed, scale: 1, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } });
  }, [src, speed]);
  return (
    <div ref={ref} className={`ep-frame${arch ? " ep-frame--arch" : ""} ${className}`} data-cursor={label}>
      <img src={src} alt={alt} loading={priority ? undefined : "lazy"} />
    </div>
  );
}

/** A block that travels against the scroll, for layered depth. */
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
    gsap.from(root.querySelectorAll(selector), { opacity: 0, y: 40, duration: 1.1, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: root, start: "top 85%", once: true } });
  });
  return <div ref={ref} className={className}>{children}</div>;
}

/** Two oversized lines that slide in opposite directions with the scroll. Decorative. */
export function Marquee({ words }: { words: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root) => {
    const rows = root.querySelectorAll(".ep-marquee__row");
    const scrollTrigger = { trigger: root, start: "top bottom", end: "bottom top", scrub: 0.6 };
    gsap.fromTo(rows[0], { xPercent: 0 }, { xPercent: -28, ease: "none", scrollTrigger });
    gsap.fromTo(rows[1], { xPercent: -28 }, { xPercent: 0, ease: "none", scrollTrigger });
  });
  const row = [...words, ...words, ...words];
  return (
    <div ref={ref} className="ep-marquee" aria-hidden="true">
      <div className="ep-marquee__row">{row.map((word, index) => <span key={index}>{word}</span>)}</div>
      <div className="ep-marquee__row">{[...row].reverse().map((word, index) => <span key={index}>{word}</span>)}</div>
    </div>
  );
}

/**
 * The signature: the arched window of the logo. Pinned for a moment while the arch widens
 * from a small window into the full-screen photograph, the title behind it dissolving.
 */
export function ArchReveal({ media, title, children }: { media: React.ReactNode; title: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root) => {
    const frame = root.querySelector(".ep-arch__window");
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const timeline = gsap.timeline({ scrollTrigger: { trigger: root, start: "top top", end: "+=170%", pin: true, scrub: 0.5, anticipatePin: 1 } });
    timeline
      .fromTo(frame, { "--ax": narrow ? "20%" : "36%", "--at": "20%", "--ab": "12%", "--ar": "50vw", "--shade": 0 }, { "--ax": "0%", "--at": "0%", "--ab": "0%", "--ar": "0vw", "--shade": 1, ease: "power2.inOut", duration: 1 })
      .fromTo(root.querySelector(".ep-arch__window > *"), { scale: 1.4 }, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
      .to(root.querySelector(".ep-arch__title"), { scale: 1.18, opacity: 0, ease: "none", duration: 0.55 }, 0.1)
      .fromTo(root.querySelector(".ep-arch__body"), { opacity: 0, y: 70 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.35 }, 0.8)
      .to({}, { duration: 0.3 });
  });
  return (
    <section ref={ref} className="ep-arch">
      <div className="ep-arch__title" aria-hidden="true">{title}</div>
      <div className="ep-arch__window">{media}</div>
      <div className="ep-container ep-arch__body">{children}</div>
    </section>
  );
}

/** Pinned on desktop: vertical scroll moves the cards sideways. On phones the track swipes natively. */
export function HorizontalScroll({ head, children, label }: { head: React.ReactNode; children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root) => {
    const media = gsap.matchMedia();
    media.add("(min-width: 1024px)", () => {
      root.classList.add("is-pinned");
      const track = root.querySelector<HTMLElement>(".ep-hscroll__track")!;
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      // Photographs counter-move slightly inside their cards.
      gsap.utils.toArray<HTMLElement>(".ep-rcard__media img", root).forEach((image) => {
        gsap.fromTo(image, { xPercent: -6, scale: 1.14 }, { xPercent: 6, scale: 1.14, ease: "none", scrollTrigger: { trigger: image, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      });
      return () => root.classList.remove("is-pinned");
    });
  });
  return (
    <section ref={ref} className="ep-hscroll" aria-label={label}>
      <div className="ep-container ep-hscroll__head">{head}</div>
      <div className="ep-hscroll__track">{children}</div>
    </section>
  );
}

/** Sticky scenes: each card slides over the previous one, which settles back and dims. */
export function Scenes({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (root) => {
    const cards = gsap.utils.toArray<HTMLElement>(".ep-scene", root);
    cards.forEach((card, index) => {
      const next = cards[index + 1];
      if (next) gsap.to(card, { scale: 0.92, filter: "brightness(0.6)", ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top 96px", scrub: true } });
      gsap.fromTo(card.querySelector("img"), { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top 96px", scrub: true } });
    });
  });
  return <div ref={ref} className="ep-scenes">{children}</div>;
}

/** Number that counts up once when it enters the viewport. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGsap(ref, (root) => {
    const state = { n: 0 };
    gsap.to(state, { n: value, duration: 1.8, ease: "power2.out", onUpdate: () => { root.textContent = String(Math.round(state.n)); }, scrollTrigger: { trigger: root, start: "top 90%", once: true } });
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

/** Full-height photograph that moves slower than the page, behind its content. */
export function ParallaxCover({ media, children, className = "ep-cta", id }: { media: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (root) => {
    gsap.fromTo(root.firstElementChild, { yPercent: -9 }, { yPercent: 9, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } });
  });
  return (
    <section ref={ref} id={id} className={className}>
      {media}
      {children}
    </section>
  );
}

/** A round label that follows the pointer over elements marked with data-cursor="…". Mouse only. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotion();
  React.useEffect(() => {
    const dot = ref.current;
    if (!dot || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const x = gsap.quickTo(dot, "x", { duration: 0.45, ease: "power3" });
    const y = gsap.quickTo(dot, "y", { duration: 0.45, ease: "power3" });
    const move = (event: PointerEvent) => {
      x(event.clientX);
      y(event.clientY);
      const target = (event.target as Element | null)?.closest?.("[data-cursor]");
      const label = target?.getAttribute("data-cursor") ?? "";
      if (label) dot.textContent = label;
      gsap.to(dot, { scale: label ? 1 : 0, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced]);
  return <div ref={ref} className="ep-cursor" aria-hidden="true" />;
}

/** Silent looping film that plays only while it is on screen, and stays a still image under reduced motion. */
export function AutoVideo({ src, poster, className = "", label }: { src: string; poster?: string | null; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { reduced } = useMotion();
  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) { video.pause(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced]);
  return <video ref={ref} className={className} src={src} poster={poster ?? undefined} muted loop playsInline preload="none" aria-label={label} />;
}
