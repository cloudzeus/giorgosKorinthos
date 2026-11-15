import type { Metadata } from "next";
import { Manrope, Noto_Serif_Display } from "next/font/google";
import "../globals.css";
import "../admin.css";

const manrope = Manrope({ subsets: ["latin", "greek"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });
const noto = Noto_Serif_Display({ subsets: ["latin", "greek"], weight: ["400"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = { title: { default: "Διαχείριση | Ephyria Lux", template: "%s | Ephyria Lux" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="el" className={`${manrope.variable} ${noto.variable}`}>
      <body className="admin">{children}</body>
    </html>
  );
}
