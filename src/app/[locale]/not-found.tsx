import Link from "next/link";

// Rendered inside the locale layout. Kept in English: the locale param is not available here.
export default function NotFound() {
  return (
    <section className="ep-container ep-stack" style={{ paddingTop: "calc(72px + var(--section))", paddingBottom: "var(--section)" }}>
      <p className="mr-eyebrow">404</p>
      <h1 className="mr-h2">This page is not here.</h1>
      <div><Link className="mr-btn" href="/">Ephyria Lux</Link></div>
    </section>
  );
}
