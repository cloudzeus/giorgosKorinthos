"use server";
// Booking management, CRM, operations (cleaning, requests, damages), rates, CMS and settings.
// Every action checks the permission on the server.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";
import { audit, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { addDays, dayString, nightsBetween, parseDay, rescheduleReservation, UnitsTakenError } from "@/lib/booking";
import { sendBookingEmail } from "@/lib/email";
import { baseDict, flatten, locales } from "@/lib/i18n";
import { AI_MODELS, FIELDS, getSettings, saveSettings } from "@/lib/settings";
import { aiConfig } from "@/lib/ai";
import { sendMail } from "@/lib/mail";
import { vivaCheck } from "@/lib/viva";
import { storageHost } from "@/lib/bunny";

const euros = (value: FormDataEntryValue | null) => Math.round(Number(String(value ?? "").replace(",", ".")) * 100);
const text = (value: FormDataEntryValue | null, max = 2000) => String(value ?? "").trim().slice(0, max);
const full = (id: string) => db.reservation.findUniqueOrThrow({ where: { id }, include: { units: { include: { unit: true } }, payments: true, extras: true } });
const paid = (reservation: { payments: { amountCents: number }[] }) => reservation.payments.reduce((sum, row) => sum + row.amountCents, 0);

// ── Reservation ───────────────────────────────────────────────
export async function reschedule(id: string, formData: FormData) {
  const user = await requirePermission("reservations.write");
  const checkIn = parseDay(text(formData.get("in"))), checkOut = parseDay(text(formData.get("out")));
  const unitIds = formData.getAll("unit").map(String);
  if (!checkIn || !checkOut || nightsBetween(checkIn, checkOut) < 1 || !unitIds.length) redirect(`/admin/reservations/${id}?error=dates`);
  try {
    await rescheduleReservation(id, unitIds, checkIn, checkOut, formData.get("reprice") === "on");
  } catch (error) {
    if (error instanceof UnitsTakenError) redirect(`/admin/reservations/${id}?error=taken`);
    throw error;
  }
  if (formData.get("notify") === "on") { const r = await full(id); await sendBookingEmail("change", r, paid(r)); }
  await audit(user.id, "reservation.reschedule", "Reservation", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservations/${id}?ok=moved`);
}

export async function updateReservation(id: string, formData: FormData) {
  const user = await requirePermission("reservations.write");
  const total = euros(formData.get("total"));
  const adults = Number(formData.get("adults")), children = Number(formData.get("children"));
  if (!text(formData.get("guestName")) || !Number.isFinite(total) || total < 0 || !Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) redirect(`/admin/reservations/${id}?error=form`);
  await db.reservation.update({ where: { id }, data: {
    guestName: text(formData.get("guestName"), 120), guestEmail: text(formData.get("guestEmail"), 200).toLowerCase(), guestPhone: text(formData.get("guestPhone"), 40) || null,
    adults, children, totalCents: total, notes: text(formData.get("notes")) || null, internalNotes: text(formData.get("internalNotes")) || null,
  } });
  await audit(user.id, "reservation.update", "Reservation", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservations/${id}?ok=saved`);
}

export async function setStay(id: string, step: "in" | "out") {
  const user = await requirePermission("reservations.write");
  const reservation = await db.reservation.update({ where: { id }, data: step === "in" ? { checkedInAt: new Date() } : { checkedOutAt: new Date() }, include: { units: true } });
  // A departure always leaves a villa to clean.
  if (step === "out") {
    const today = parseDay(dayString(new Date()))!;
    await db.ticket.createMany({ skipDuplicates: true, data: reservation.units.map((row) => ({ type: "CLEANING" as const, priority: "HIGH" as const, title: "Καθαρισμός αναχώρησης", unitId: row.unitId, reservationId: id, dueDate: today, autoKey: `clean:${row.unitId}:${dayString(today)}:out` })) });
  }
  await audit(user.id, `reservation.check${step}`, "Reservation", id);
  revalidatePath("/admin", "layout");
}

export async function addPayment(id: string, formData: FormData) {
  const user = await requirePermission("reservations.write");
  const amount = euros(formData.get("amount"));
  const method = z.enum(["CASH", "BANK", "POS", "VIVA"]).safeParse(formData.get("method"));
  if (!Number.isFinite(amount) || amount === 0 || !method.success) redirect(`/admin/reservations/${id}?error=payment`);
  await db.payment.create({ data: { reservationId: id, amountCents: formData.get("refund") === "on" ? -Math.abs(amount) : Math.abs(amount), method: method.data, note: text(formData.get("note"), 200) || null } });
  await audit(user.id, "payment.add", "Reservation", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservations/${id}?ok=payment`);
}

export async function resendConfirmation(id: string) {
  const user = await requirePermission("reservations.write");
  const r = await full(id);
  const sent = await sendBookingEmail("confirm", r, paid(r));
  await audit(user.id, "reservation.resend", "Reservation", id);
  redirect(`/admin/reservations/${id}?${sent ? "ok=sent" : "error=mail"}`);
}

// ── CRM ───────────────────────────────────────────────────────
export async function saveGuest(id: string | null, formData: FormData) {
  const user = await requirePermission("crm.write");
  const email = text(formData.get("email"), 200).toLowerCase(), name = text(formData.get("name"), 120);
  if (!name || !z.string().email().safeParse(email).success) redirect(`/admin/guests${id ? `/${id}` : ""}?error=form`);
  const data = { name, email, phone: text(formData.get("phone"), 40) || null, country: text(formData.get("country"), 60) || null, language: text(formData.get("language"), 2) || "el", vip: formData.get("vip") === "on", marketingConsent: formData.get("marketingConsent") === "on", notes: text(formData.get("notes")) || null };
  const clash = await db.guest.findFirst({ where: { email, ...(id ? { NOT: { id } } : {}) } });
  if (clash) redirect(`/admin/guests/${clash.id}?error=exists`);
  const guest = id ? await db.guest.update({ where: { id }, data }) : await db.guest.create({ data });
  await audit(user.id, id ? "guest.update" : "guest.create", "Guest", guest.id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/guests/${guest.id}?ok=saved`);
}

export async function addActivity(guestId: string, formData: FormData) {
  const user = await requirePermission("crm.write");
  const type = z.enum(["NOTE", "CALL", "EMAIL"]).catch("NOTE").parse(formData.get("type"));
  const body = text(formData.get("text"));
  if (!body) redirect(`/admin/guests/${guestId}?error=note`);
  await db.activity.create({ data: { guestId, userId: user.id, type, text: body } });
  revalidatePath(`/admin/guests/${guestId}`);
  redirect(`/admin/guests/${guestId}?ok=note`);
}

// ── Operations: cleaning, guest requests, maintenance, damages ─
const ticket = z.object({
  type: z.enum(["CLEANING", "GUEST_REQUEST", "MAINTENANCE", "DAMAGE"]),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).default("OPEN"),
});

export async function saveTicket(id: string | null, back: string, formData: FormData) {
  const user = await requirePermission("ops.write");
  const parsed = ticket.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${back}${back.includes("?") ? "&" : "?"}error=form`);
  const cost = text(formData.get("cost")) ? euros(formData.get("cost")) : null;
  const data = {
    ...parsed.data, description: parsed.data.description || null,
    dueDate: parseDay(text(formData.get("dueDate"))), unitId: text(formData.get("unitId")) || null, assigneeId: text(formData.get("assigneeId")) || null,
    reservationId: text(formData.get("reservationId")) || null, guestId: text(formData.get("guestId")) || null,
    costCents: cost !== null && Number.isFinite(cost) && cost >= 0 ? cost : null, chargedToGuest: formData.get("chargedToGuest") === "on",
    doneAt: parsed.data.status === "DONE" ? new Date() : null,
  };
  const saved = id ? await db.ticket.update({ where: { id }, data }) : await db.ticket.create({ data });
  await audit(user.id, id ? "ticket.update" : "ticket.create", "Ticket", saved.id);
  revalidatePath("/admin", "layout");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=saved`);
}

export async function setTicketStatus(id: string, status: TicketStatus) {
  const user = await requirePermission("ops.write");
  await db.ticket.update({ where: { id }, data: { status, doneAt: status === "DONE" ? new Date() : null } });
  await audit(user.id, `ticket.${status.toLowerCase()}`, "Ticket", id);
  revalidatePath("/admin", "layout");
}

/** Cleaning plan for the next 7 days from the confirmed stays. Safe to run again: nothing is created twice. */
export async function generateCleaning() {
  const user = await requirePermission("ops.write");
  const today = parseDay(dayString(new Date()))!;
  const end = addDays(today, 7);
  const stays = await db.reservation.findMany({ where: { status: "CONFIRMED", checkIn: { lt: end }, checkOut: { gte: today } }, include: { units: true } });
  const rows = [];
  for (const stay of stays) for (const { unitId } of stay.units) for (let day = today; day < end; day = addDays(day, 1)) {
    const key = dayString(day);
    if (dayString(stay.checkOut) === key) rows.push({ title: "Καθαρισμός αναχώρησης", priority: "HIGH" as const, autoKey: `clean:${unitId}:${key}:out`, unitId, day, id: stay.id });
    else if (stay.checkIn < day && day < stay.checkOut) {
      // House rules: daily cleaning and towels, bed linen every second day of the stay.
      const linen = nightsBetween(stay.checkIn, day) % 2 === 0;
      rows.push({ title: linen ? "Καθημερινός καθαρισμός, πετσέτες και αλλαγή κλινοσκεπασμάτων" : "Καθημερινός καθαρισμός και πετσέτες", priority: "NORMAL" as const, autoKey: `clean:${unitId}:${key}:day`, unitId, day, id: stay.id });
    }
  }
  const made = await db.ticket.createMany({ skipDuplicates: true, data: rows.map((row) => ({ type: "CLEANING" as const, title: row.title, priority: row.priority, autoKey: row.autoKey, unitId: row.unitId, dueDate: row.day, reservationId: row.id })) });
  await audit(user.id, "cleaning.generate", "Ticket");
  revalidatePath("/admin", "layout");
  redirect(`/admin/ops?type=CLEANING&ok=generated&n=${made.count}`);
}

// ── Seasonal rates ────────────────────────────────────────────
export async function saveRate(unitId: string, rateId: string | null, formData: FormData) {
  const user = await requirePermission("rooms.write");
  const from = parseDay(text(formData.get("from"))), to = parseDay(text(formData.get("to")));
  const price = euros(formData.get("price")), minNights = Number(formData.get("minNights") || 1);
  if (!from || !to || to < from || !Number.isFinite(price) || price <= 0 || !Number.isInteger(minNights) || minNights < 1 || minNights > 30 || !text(formData.get("name"))) redirect("/admin/rooms?error=rate");
  const data = { name: text(formData.get("name"), 80), from, to, priceCents: price, minNights };
  // updateMany with the villa in the filter: a period can only be edited through its own villa.
  if (rateId) await db.ratePeriod.updateMany({ where: { id: rateId, unitId }, data });
  else await db.ratePeriod.create({ data: { ...data, unitId } });
  await audit(user.id, rateId ? "rate.update" : "rate.create", "Unit", unitId);
  revalidatePath("/", "layout");
  redirect("/admin/rooms?ok=rate");
}

export async function deleteRate(id: string) {
  const user = await requirePermission("rooms.write");
  await db.ratePeriod.delete({ where: { id } });
  await audit(user.id, "rate.delete", "RatePeriod", id);
  revalidatePath("/", "layout");
}

// ── CMS: texts of the public site ─────────────────────────────
export async function saveContent(section: string, formData: FormData) {
  const user = await requirePermission("cms.write");
  for (const locale of locales) {
    const base = flatten((baseDict(locale) as Record<string, unknown>)[section], section);
    for (const [key, original] of Object.entries(base)) {
      const value = text(formData.get(`${locale}|${key}`), 6000);
      // Same as the built-in text (or left empty): no override needed.
      if (!value || value === original) await db.contentBlock.deleteMany({ where: { key, locale } });
      else await db.contentBlock.upsert({ where: { key_locale: { key, locale } }, update: { value }, create: { key, locale, value } });
    }
  }
  await audit(user.id, "content.save", "ContentBlock", section);
  revalidatePath("/", "layout");
  redirect(`/admin/site?section=${section}&ok=saved`);
}

// ── Settings ──────────────────────────────────────────────────
export async function saveIntegrationSettings(formData: FormData) {
  const user = await requirePermission("settings.write");
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = text(formData.get(field.key), 500);
    if (field.secret && !value) continue; // blank secret = keep what is stored
    if (value && field.pattern && !new RegExp(`^${field.pattern}$`).test(value)) redirect(`/admin/settings?error=${encodeURIComponent(field.label)}`);
    values[field.key] = formData.get(`clear:${field.key}`) === "on" ? "" : value;
  }
  for (const field of FIELDS) if (field.secret && formData.get(`clear:${field.key}`) === "on") values[field.key] = "";
  await saveSettings(values);
  await audit(user.id, "settings.save", "Setting");
  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=saved");
}

/** Drag and drop on the plan: move a stay to other dates or the other villa, or change its length. */
export async function planMove(id: string, unitId: string, inDay: string, outDay: string): Promise<{ ok: boolean; message?: string }> {
  const user = await requirePermission("reservations.write");
  const checkIn = parseDay(inDay), checkOut = parseDay(outDay);
  if (!checkIn || !checkOut || nightsBetween(checkIn, checkOut) < 1) return { ok: false, message: "Η διαμονή πρέπει να έχει τουλάχιστον μία βραδιά." };
  const reservation = await db.reservation.findUnique({ where: { id }, include: { units: true } });
  if (!reservation || reservation.status === "CANCELLED") return { ok: false, message: "Η κράτηση δεν βρέθηκε." };
  if (reservation.units.length !== 1) return { ok: false, message: "Η κράτηση έχει δύο βίλες. Αλλάξτε την από την καρτέλα της." };
  try {
    // Blocked dates carry no price; real stays are re-priced for their new nights.
    await rescheduleReservation(id, [unitId], checkIn, checkOut, reservation.status !== "BLOCKED");
  } catch (error) {
    if (error instanceof UnitsTakenError) return { ok: false, message: "Η βίλα είναι ήδη κλεισμένη σε αυτές τις ημερομηνίες. Δεν άλλαξε τίποτα." };
    throw error;
  }
  await audit(user.id, "reservation.plan-move", "Reservation", id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ── Extra services ────────────────────────────────────────────
export async function saveExtra(id: string | null, formData: FormData) {
  const user = await requirePermission("rooms.write");
  const price = euros(formData.get("price"));
  const pricing = z.enum(["PER_STAY", "PER_NIGHT", "PER_PERSON"]).safeParse(formData.get("pricing"));
  const unitIds = formData.getAll("unit").map(String);
  const names = locales.map((locale) => ({ locale, name: text(formData.get(`${locale}.name`), 120), description: text(formData.get(`${locale}.description`), 2000) }));
  // Greek is required; an empty English or German name falls back to the Greek one.
  if (!names[0].name || !Number.isFinite(price) || price < 0 || !pricing.success || !unitIds.length) redirect("/admin/extras?error=form");
  const translations = names.map((row) => ({ ...row, name: row.name || names[0].name, description: row.description || names[0].description }));
  // Only pictures that exist in the media library can be attached.
  const photos = (await db.mediaAsset.findMany({ where: { id: { in: formData.getAll("photo").map(String) }, kind: "IMAGE" }, select: { url: true } })).map((row) => row.url);
  const data = { priceCents: price, pricing: pricing.data, active: formData.get("active") === "on", sort: Number(formData.get("sort")) || 0, photos };
  const saved = id
    ? await db.extra.update({ where: { id }, data: { ...data, units: { set: unitIds.map((unit) => ({ id: unit })) }, translations: { deleteMany: {}, create: translations } } })
    : await db.extra.create({ data: { ...data, units: { connect: unitIds.map((unit) => ({ id: unit })) }, translations: { create: translations } } });
  await audit(user.id, id ? "extra.update" : "extra.create", "Extra", saved.id);
  revalidatePath("/", "layout");
  redirect("/admin/extras?ok=saved");
}

export async function deleteExtra(id: string) {
  const user = await requirePermission("rooms.write");
  await db.extra.delete({ where: { id } }); // past reservations keep their snapshot of the name and amount
  await audit(user.id, "extra.delete", "Extra", id);
  revalidatePath("/", "layout");
}

// ── Connection tests ──────────────────────────────────────────
const refused = (status: number) => status === 401 || status === 403 ? "Το κλειδί δεν έγινε δεκτό. Ελέγξτε ότι το αντιγράψατε ολόκληρο." : status === 404 ? "Δεν βρέθηκε. Ελέγξτε το όνομα και την περιοχή." : `Η υπηρεσία απάντησε με σφάλμα ${status}.`;

/** Try the saved credentials of one integration against the real service. Nothing is charged or published. */
export async function testConnection(group: string): Promise<{ ok: boolean; message: string }> {
  await requirePermission("settings.write");
  const s = await getSettings();
  const signal = () => AbortSignal.timeout(15_000);
  try {
    if (group === "Bunny CDN") {
      if (!s.BUNNY_STORAGE_ZONE || !s.BUNNY_STORAGE_KEY) return { ok: false, message: "Συμπληρώστε και αποθηκεύστε πρώτα το όνομα και τον κωδικό του storage zone." };
      const res = await fetch(`https://${storageHost(s.BUNNY_STORAGE_HOST)}/${s.BUNNY_STORAGE_ZONE}/`, { headers: { AccessKey: s.BUNNY_STORAGE_KEY, Accept: "application/json" }, cache: "no-store", signal: signal() });
      if (!res.ok) return { ok: false, message: res.status === 401 ? "Το storage δεν δέχτηκε τον κωδικό. Ελέγξτε τον κωδικό (Password) του storage zone και ότι διαλέξατε τη σωστή περιοχή storage." : refused(res.status) };
      return { ok: true, message: s.BUNNY_CDN_URL ? "Η σύνδεση με το storage δουλεύει. Μπορείτε να ανεβάσετε αρχεία." : "Η σύνδεση με το storage δουλεύει. Λείπει ακόμη η διεύθυνση Pull Zone." };
    }
    if (group === "Mailgun") {
      if (!s.MAILGUN_API_KEY || !s.MAILGUN_DOMAIN) return { ok: false, message: "Συμπληρώστε και αποθηκεύστε πρώτα το API key και το domain." };
      const res = await fetch(`${s.MAILGUN_BASE_URL || "https://api.eu.mailgun.net"}/v3/domains/${encodeURIComponent(s.MAILGUN_DOMAIN)}`, { headers: { Authorization: `Basic ${Buffer.from(`api:${s.MAILGUN_API_KEY}`).toString("base64")}` }, cache: "no-store", signal: signal() });
      if (!res.ok) return { ok: false, message: res.status === 404 ? "Το domain δεν βρέθηκε σε αυτή την περιοχή. Δοκιμάστε την άλλη περιοχή λογαριασμού." : refused(res.status) };
      if (!s.MAIL_NOTIFY) return { ok: true, message: "Το κλειδί και το domain είναι σωστά. Ορίστε «Email για ειδοποιήσεις» για να σταλεί και δοκιμαστικό μήνυμα." };
      const sent = await sendMail(s.MAIL_NOTIFY, "Ephyria Lux: δοκιμή σύνδεσης", "Αυτό είναι δοκιμαστικό μήνυμα από τις Ρυθμίσεις του διαχειριστικού. Αν το βλέπετε, η αποστολή email δουλεύει.");
      return sent ? { ok: true, message: `Στάλθηκε δοκιμαστικό μήνυμα στο ${s.MAIL_NOTIFY}. Ελέγξτε τα εισερχόμενα.` } : { ok: false, message: "Το κλειδί είναι σωστό, αλλά το μήνυμα δεν έφυγε. Ελέγξτε τον αποστολέα και ότι το domain είναι επαληθευμένο στη Mailgun." };
    }
    if (group === "Viva Payments") {
      if (!s.VIVA_CLIENT_ID || !s.VIVA_CLIENT_SECRET) return { ok: false, message: "Συμπληρώστε και αποθηκεύστε πρώτα το Client ID και το Client secret." };
      const env = await vivaCheck().catch(() => null);
      if (!env) return { ok: false, message: "Η Viva δεν δέχτηκε το Client ID ή το Client secret. Ελέγξτε ότι ταιριάζουν με το περιβάλλον που διαλέξατε." };
      return { ok: true, message: `${env === "production" ? "Σύνδεση με πραγματικές χρεώσεις" : "Σύνδεση με το δοκιμαστικό περιβάλλον"}: τα στοιχεία έγιναν δεκτά.${s.VIVA_SOURCE_CODE ? "" : " Λείπει ακόμη ο κωδικός πηγής πληρωμής."}` };
    }
    if (group === "OpenRouter (AI)") {
      const ai = await aiConfig();
      if (!ai.key) return { ok: false, message: "Συμπληρώστε και αποθηκεύστε πρώτα το API key." };
      const res = await fetch(`${ai.url}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: ai.model, max_tokens: 8, messages: [{ role: "user", content: "Reply with the single word OK." }] }), signal: signal() });
      if (!res.ok) return { ok: false, message: res.status === 402 ? "Το κλειδί είναι σωστό, αλλά ο λογαριασμός δεν έχει υπόλοιπο. Προσθέστε credits στο OpenRouter." : refused(res.status) };
      return { ok: true, message: `Το μοντέλο ${AI_MODELS.find((option) => option.value === ai.model)?.label ?? ai.model} απάντησε. Η συγγραφή άρθρων είναι έτοιμη.` };
    }
    return { ok: false, message: "Άγνωστη σύνδεση." };
  } catch {
    return { ok: false, message: "Η υπηρεσία δεν απάντησε. Ελέγξτε τη σύνδεση στο internet και δοκιμάστε ξανά." };
  }
}
