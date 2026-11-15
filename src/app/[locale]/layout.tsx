import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Noto_Serif_Display } from "next/font/google";
import "../globals.css";
import { alternates, getDict } from "@/lib/i18n";
import { contact, img } from "@/lib/site";
import { LogoFull, LogoHorizontal, LogoMark, LogoWordmark } from "@/components/site/Logo";
import { HeaderShell, MotionToggle, Providers, RouteTransition } from "@/components/site/motion-kit";
import { Botanical, Cursor } from "@/components/site/fx";
import { Consent } from "@/components/site/consent";
import { getSettings } from "@/lib/settings";

// Display: a high-contrast serif with Greek. Text and UI: Manrope.
const noto = Noto_Serif_Display({ subsets: ["latin", "greek"], weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-noto", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "greek"], weight: ["300", "400", "500", "600"], variable: "--font-manrope", display: "swap" });

// No generateStaticParams on purpose: pages render on first request and are cached, so the build needs no database.
// Admin actions and the content cron call revalidatePath to refresh them.

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t.meta.title, template: "%s | Ephyria Lux" },
    description: t.meta.description,
    alternates: alternates("", locale),
    openGraph: { siteName: "Ephyria Lux", locale, type: "website", images: ["/images/outdoor-08.webp"] },
  };
}

// Shows the intro curtain once per browser session.
const SEEN = `try{if(sessionStorage.getItem("ep-seen"))document.documentElement.classList.add("is-returning");sessionStorage.setItem("ep-seen","1")}catch(e){}`;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await getDict((await params).locale);
  const base = `/${locale}`;
  const settings = await getSettings();
  const items = [
    { href: `${base}/villa`, label: t.nav.villa },
    { href: `${base}/accommodation`, label: t.nav.rooms },
    { href: `${base}/experiences`, label: t.nav.experiences },
    { href: `${base}/explore-corinth`, label: t.nav.explore },
    { href: `${base}/gallery`, label: t.nav.gallery },
    { href: `${base}/contact`, label: t.nav.contact },
  ];
  return (
    <html lang={locale} className={`${noto.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SEEN }} />
        <div className="ep-loader" aria-hidden="true"><LogoMark mono /></div>
        <a className="mr-btn ep-skip" href="#main">{t.nav.skip}</a>
        <Providers>
          <HeaderShell
            logo={<LogoHorizontal mono />}
            items={items}
            book={{ href: `${base}/booking`, label: t.nav.book }}
            locale={locale}
            labels={{ menu: t.nav.menu, close: t.gallery.close, language: t.nav.language, home: t.nav.home }}
            overHero={["/", "/villa", "/explore-corinth"]}
            media={<img src={img("outdoor-10")} alt="" loading="lazy" />}
            contact={<><a href={contact.phoneHref}>{contact.phone}</a><a href={`mailto:${contact.email}`}>{contact.email}</a><span>{t.contact.address}</span></>}
          />
          <main id="main"><RouteTransition>{children}</RouteTransition></main>
          <footer className="ep-footer ep-leafy">
            <Botanical name="branch-gold-b" className="ep-deco--br ep-deco--faint" from="right" rotate={14} drift={40} />
            <div className="ep-container">
              <div className="ep-footer__top">
                <div className="ep-stack">
                  <LogoFull mono className="ep-footer__logo" />
                  <p className="mr-editorial" style={{ color: "var(--text-inverse-muted)", maxWidth: "24ch" }}>{t.footer.tagline}</p>
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
                    <li><Link href={`${base}/stay`}>{t.stay.eyebrow}</Link></li>
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
              <LogoWordmark className="ep-footer__sig" title="" />
            </div>
          </footer>
          <Cursor />
          <Consent ids={{ ga: settings.GA_MEASUREMENT_ID, ads: settings.GOOGLE_ADS_ID, gtm: settings.GTM_ID }} labels={t.cookie} />
        </Providers>
      </body>
    </html>
  );
}
