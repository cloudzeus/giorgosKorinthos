import { NextResponse } from "next/server";
import { auth, audit, can } from "@/auth";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { bunnyConfigured, bunnyUpload, cdnUrl, safePath } from "@/lib/bunny";
import { revalidatePath } from "next/cache";

export const maxDuration = 300;

const TYPES: Record<string, { kind: "IMAGE" | "VIDEO"; ext: string }> = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg" }, "image/png": { kind: "IMAGE", ext: "png" }, "image/webp": { kind: "IMAGE", ext: "webp" }, "image/avif": { kind: "IMAGE", ext: "avif" },
  "video/mp4": { kind: "VIDEO", ext: "mp4" }, "video/webm": { kind: "VIDEO", ext: "webm" }, "video/quicktime": { kind: "VIDEO", ext: "mov" },
};
const FOLDERS = ["images/villas", "images/places", "images/gallery", "videos"];
const MAX_BYTES = 500 * 1024 * 1024;

// One file per request, sent as the raw body, so large films stream straight through to Bunny Storage.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as { id: string; role?: Role } | undefined;
  if (!user || !can(user.role, "media.write")) return NextResponse.json({ error: "Δεν έχετε δικαίωμα ανεβάσματος." }, { status: 403 });
  if (!bunnyConfigured()) return NextResponse.json({ error: "Το Bunny CDN δεν είναι ρυθμισμένο. Συμπληρώστε τα BUNNY_* στο .env." }, { status: 503 });

  const type = TYPES[request.headers.get("content-type") ?? ""];
  const bytes = Number(request.headers.get("content-length"));
  const folder = request.headers.get("x-folder") ?? "";
  const original = decodeURIComponent(request.headers.get("x-filename") ?? "").slice(0, 160);
  if (!type) return NextResponse.json({ error: "Επιτρέπονται εικόνες JPG, PNG, WebP, AVIF και βίντεο MP4, WebM, MOV." }, { status: 415 });
  if (!FOLDERS.includes(folder) || !original || !request.body) return NextResponse.json({ error: "Λείπει φάκελος ή αρχείο." }, { status: 400 });
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) return NextResponse.json({ error: "Το αρχείο ξεπερνά τα 500 MB." }, { status: 413 });

  // Timestamp prefix: two uploads with the same name never overwrite each other.
  const base = original.replace(/\.[^.]+$/, "");
  const path = safePath(folder, `${Date.now().toString(36)}-${base}.${type.ext}`);
  try {
    await bunnyUpload(path, request.body, request.headers.get("content-type")!);
  } catch (error) {
    console.error("[media] upload failed:", error);
    return NextResponse.json({ error: "Το ανέβασμα στο Bunny απέτυχε. Δοκιμάστε ξανά." }, { status: 502 });
  }
  const asset = await db.mediaAsset.create({ data: { kind: type.kind, path, url: cdnUrl(path), title: base, bytes } });
  await audit(user.id, "media.upload", "MediaAsset", asset.id);
  revalidatePath("/admin/media");
  return NextResponse.json({ ok: true, id: asset.id });
}
