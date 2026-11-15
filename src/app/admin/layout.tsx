import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "../globals.css";
import "../admin.css";

const manrope = Manrope({ subsets: ["latin", "greek"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = { title: { default: "Διαχείριση | Ephyria Lux", template: "%s | Ephyria Lux" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="el" className={`${manrope.variable} ${inter.variable}`}>
      <body className="admin">{children}</body>
    </html>
  );
}
