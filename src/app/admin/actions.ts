"use server";
// Every action checks the permission on the server. Hiding a button is not access control.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { audit, requirePermission, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { createReservation, parseDay, UnitsTakenError, nightsBetween } from "@/lib/booking";
import { generateArticle } from "@/lib/ai";
import { locales } from "@/lib/i18n";
import { sendBookingEmail } from "@/lib/email";
import { bunnyConfigured, bunnyDelete } from "@/lib/bunny";
import { isSlot } from "@/lib/media";

export async function login(formData: FormData) {
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/admin/login?error=1");
    throw error; // the success redirect is thrown too
  }
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

// ── Reservations ──────────────────────────────────────────────
export async function setReservationStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
  const user = await requirePermission("reservations.write");
  const before = await db.reservation.findUnique({ where: { id }, select: { status: true } });
  const reservation = await db.reservation.update({ where: { id }, data: { status, holdExpiresAt: null }, include: { units: { include: { unit: true } }, payments: true, extras: true } });
  // Tell the guest when a confirmed stay is cancelled. Blocked dates and expired holds have nobody to tell.
  if (status === "CANCELLED" && before?.status === "CONFIRMED") await sendBookingEmail("cancel", reservation, reservation.payments.reduce((sum, row) => sum + row.amountCents, 0));
  await audit(user.id, `reservation.${status.toLowerCase()}`, "Reservation", id);
  revalidatePath("/admin", "layout");
}

const manual = z.object({
  kind: z.enum(["CONFIRMED", "BLOCKED"]),
  in: z.string(),
  out: z.string(),
  guestName: z.string().trim().max(120).optional(),
  guestEmail: z.string().trim().max(200).optional(),
  guestPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  adults: z.coerce.number().int().min(1).max(11).default(2),
});

/** Manual reservation (phone, another channel) or blocked dates. */
export async function createManualReservation(formData: FormData) {
  const user = await requirePermission("reservations.write");
  const parsed = manual.safeParse(Object.fromEntries(formData));
  const unitIds = formData.getAll("unit").map(String);
  const checkIn = parsed.success ? parseDay(parsed.data.in) : null;
  const checkOut = parsed.success ? parseDay(parsed.data.out) : null;
  // Opened from the plan: return to the same month there.
  const month = String(formData.get("back") ?? "");
  const to = (result: string) => (/^\d{4}-\d{2}$/.test(month) ? `/admin/plan?m=${month}&${result}` : `/admin/reservations?${result}`);
  if (!parsed.success || !checkIn || !checkOut || nightsBetween(checkIn, checkOut) < 1 || !unitIds.length) redirect(to("error=form"));
  const blocked = parsed.data.kind === "BLOCKED";
  try {
    const reservation = await createReservation({
      unitIds, checkIn, checkOut, adults: parsed.data.adults, children: 0,
      guestName: blocked ? "Κλειστές ημερομηνίες" : parsed.data.guestName || "Χωρίς όνομα",
      guestEmail: blocked ? "" : parsed.data.guestEmail ?? "",
      guestPhone: parsed.data.guestPhone, notes: parsed.data.notes, locale: "el", status: parsed.data.kind, source: "MANUAL",
    });
    await audit(user.id, blocked ? "reservation.block" : "reservation.manual", "Reservation", reservation.id);
  } catch (error) {
    if (error instanceof UnitsTakenError) redirect(to("error=taken"));
    throw error;
  }
  revalidatePath("/admin", "layout");
  redirect(to("ok=1"));
}

// ── Rooms and rates ───────────────────────────────────────────
export async function updateUnit(id: string, formData: FormData) {
  const user = await requirePermission("rooms.write");
  const euros = Number(String(formData.get("price")).replace(",", "."));
  const capacity = Number(formData.get("capacity"));
  if (!Number.isFinite(euros) || euros <= 0 || euros > 100000 || !Number.isInteger(capacity) || capacity < 1 || capacity > 20) redirect("/admin/rooms?error=1");
  await db.unit.update({ where: { id }, data: { priceCents: Math.round(euros * 100), capacity, active: formData.get("active") === "on" } });
  await audit(user.id, "unit.update", "Unit", id);
  revalidatePath("/", "layout");
  redirect("/admin/rooms?ok=1");
}

// ── Content ───────────────────────────────────────────────────
export async function generateContent(formData: FormData) {
  const user = await requirePermission("content.write");
  let id: string;
  try {
    id = await generateArticle(String(formData.get("topic") ?? ""));
  } catch (error) {
    console.error("[admin] content generation failed:", error);
    redirect(`/admin/content?error=${encodeURIComponent(error instanceof Error ? error.message.slice(0, 160) : "failed")}`);
  }
  await audit(user.id, "article.generate", "Article", id);
  revalidatePath("/", "layout");
  redirect("/admin/content?ok=generated");
}

export async function setArticleStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  const user = await requirePermission("content.write");
  await db.article.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? new Date() : null } });
  await audit(user.id, `article.${status.toLowerCase()}`, "Article", id);
  revalidatePath("/", "layout");
}

export async function deleteArticle(id: string) {
  const user = await requirePermission("content.write");
  await db.article.delete({ where: { id } });
  await audit(user.id, "article.delete", "Article", id);
  revalidatePath("/", "layout");
}

const text = z.object({ title: z.string().trim().min(3).max(160), excerpt: z.string().trim().min(10).max(400), body: z.string().trim().min(50), metaTitle: z.string().trim().min(3).max(80), metaDescription: z.string().trim().min(10).max(200) });

export async function updateArticle(id: string, formData: FormData) {
  const user = await requirePermission("content.write");
  for (const locale of locales) {
    const parsed = text.safeParse(Object.fromEntries(["title", "excerpt", "body", "metaTitle", "metaDescription"].map((key) => [key, formData.get(`${locale}.${key}`)])));
    if (!parsed.success) redirect("/admin/content?error=" + encodeURIComponent(`Λείπει ή είναι πολύ σύντομο πεδίο (${locale})`));
    await db.articleTranslation.update({ where: { articleId_locale: { articleId: id, locale } }, data: parsed.data });
  }
  await audit(user.id, "article.update", "Article", id);
  revalidatePath("/", "layout");
  redirect("/admin/content?ok=saved");
}

// ── Messages ──────────────────────────────────────────────────
export async function setInquiryHandled(id: string, handled: boolean) {
  const user = await requirePermission("messages.write");
  await db.inquiry.update({ where: { id }, data: { handled } });
  await audit(user.id, handled ? "inquiry.handled" : "inquiry.reopen", "Inquiry", id);
  revalidatePath("/admin", "layout");
}

// ── Media library ─────────────────────────────────────────────
export async function updateMedia(id: string, formData: FormData) {
  const user = await requirePermission("media.write");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const credit = String(formData.get("credit") ?? "").trim().slice(0, 200);
  const slot = String(formData.get("slot") ?? "");
  if (!title || (slot && !isSlot(slot))) redirect("/admin/media?error=form");
  // A slot holds one file: free it from whoever had it.
  if (slot) await db.mediaAsset.updateMany({ where: { slot, NOT: { id } }, data: { slot: null } });
  await db.mediaAsset.update({ where: { id }, data: { title, credit: credit || null, slot: slot || null } });
  await audit(user.id, "media.update", "MediaAsset", id);
  revalidatePath("/", "layout");
  redirect("/admin/media?ok=saved");
}

export async function deleteMedia(id: string) {
  const user = await requirePermission("media.write");
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;
  if (asset.url.startsWith("http") && (await bunnyConfigured())) {
    await bunnyDelete(asset.path);
    if (asset.poster) await bunnyDelete(asset.path.replace(/\.mp4$/, ".webp"));
  }
  await db.mediaAsset.delete({ where: { id } });
  await audit(user.id, "media.delete", "MediaAsset", id);
  revalidatePath("/", "layout");
}
