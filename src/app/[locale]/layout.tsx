import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter, Manrope } from "next/font/google";
import "../globals.css";
import { alternates, getDict } from "@/lib/i18n";
import { contact } from "@/lib/site";
import { LogoFull, LogoHorizontal } from "@/components/site/Logo";
import { HeaderShell, MotionToggle, Providers, RouteTransition } from "@/components/site/motion-kit";

const manrope = Manrope({ subsets: ["latin", "greek"], weight: ["300", "400", "500", "600"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });

// No generateStaticParams on purpose: pages render on first request and are cached, so the build needs no database.
// Admin actions and the content cron call revalidatePath to refresh them.

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale, t } = getDict((await params).locale);
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t.meta.title, template: "%s | Ephyria Lux" },
    description: t.meta.description,
    alternates: alternates("", locale),
    openGraph: { siteName: "Ephyria Lux", locale, type: "website", images: ["/images/outdoor-08.webp"] },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = getDict((await params).locale);
  const base = `/${locale}`;
  const items = [
    { href: `${base}/villa`, label: t.nav.villa },
    { href: `${base}/accommodation`, label: t.nav.rooms },
    { href: `${base}/experiences`, label: t.nav.experiences },
    { href: `${base}/explore-corinth`, label: t.nav.explore },
    { href: `${base}/gallery`, label: t.nav.gallery },
    { href: `${base}/contact`, label: t.nav.contact },
  ];
  return (
    <html lang={locale} className={`${manrope.variable} ${inter.variable} ${cormorant.variable}`}>
      <body>
        <a className="mr-btn ep-skip" href="#main">{t.nav.skip}</a>
        <Providers>
          <HeaderShell
            logo={<LogoHorizontal mono />}
            items={items}
            book={{ href: `${base}/booking`, label: t.nav.book }}
            locale={locale}
            labels={{ menu: t.nav.menu, language: t.nav.language, home: t.nav.home }}
            overHero={["/", "/villa", "/explore-corinth"]}
          />
          <main id="main"><RouteTransition>{children}</RouteTransition></main>
          <footer className="ep-footer">
            <div className="ep-container">
              <div className="ep-footer__top">
                <div className="ep-stack">
                  <LogoFull mono className="ep-footer__logo" />
                  <p className="mr-body" style={{ color: "var(--text-inverse-muted)", maxWidth: "32ch" }}>{t.footer.tagline}</p>
                </div>
                <nav aria-label={t.footer.explore}>
                  <h2>{t.footer.explore}</h2>
                  <ul>{items.slice(0, 3).map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul>
                </nav>
                <nav aria-label={t.nav.menu}>
                  <h2>&nbsp;</h2>
                  <ul>
                    {items.slice(3).map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}
                    <li><Link href={`${base}/booking`}>{t.nav.book}</Link></li>
                  </ul>
                </nav>
                <div>
                  <h2>{t.footer.contact}</h2>
                  <ul>
                    <li><a href={contact.phoneHref}>{contact.phone}</a></li>
                    <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
                    <li style={{ color: "var(--text-inverse-muted)", paddingTop: "var(--space-2)" }}>{t.contact.address}</li>
                  </ul>
                </div>
              </div>
              <div className="ep-footer__bottom">
                <span>© {new Date().getFullYear()} Ephyria Lux. {t.footer.rights}</span>
                <MotionToggle offLabel={t.footer.motionOff} onLabel={t.footer.motionOn} />
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
