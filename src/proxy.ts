import { NextResponse, type NextRequest } from "next/server";

const locales = ["el", "en", "de"];

// Send requests without a locale prefix to the visitor's language (Greek by default).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const accepted = (request.headers.get("accept-language") ?? "").split(",").map((part) => part.trim().slice(0, 2).toLowerCase());
  const locale = accepted.find((code) => locales.includes(code)) ?? "el";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the admin, API routes, Next internals and files with an extension.
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
