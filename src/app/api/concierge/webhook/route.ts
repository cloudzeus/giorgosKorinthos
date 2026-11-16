import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { TicketType } from "@prisma/client";

// Receives concierge events from the hotelVideo app (ephyria-video):
//   service_request -> opens a Ticket
//   profile_update  -> upserts the Guest profile
// Signed with CONCIERGE_WEBHOOK_SECRET (shared with hotelVideo's
// HOTEL_CRM_WEBHOOK_SECRET): HMAC-SHA256 over the raw body, hex, in
// the x-hotelvideo-signature header.

const CATEGORY_TO_TICKET: Record<string, TicketType> = {
  HOUSEKEEPING: "CLEANING",
  MAINTENANCE: "MAINTENANCE",
  // FOOD_BEVERAGE / TRANSPORT / CONCIERGE / OTHER -> GUEST_REQUEST
};

type Guest = { email?: string; phone?: string; firstName?: string; lastName?: string };

function verify(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Resolve (or create) a Guest by email; returns its id or null when no email.
async function resolveGuestId(g: Guest | undefined): Promise<string | null> {
  if (!g?.email) return null;
  const name = [g.firstName, g.lastName].filter(Boolean).join(" ") || g.email;
  const guest = await db.guest.upsert({
    where: { email: g.email },
    update: { ...(g.phone ? { phone: g.phone } : {}) },
    create: { email: g.email, name, phone: g.phone ?? null },
    select: { id: true },
  });
  return guest.id;
}

export async function POST(request: Request) {
  const secret = process.env.CONCIERGE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const raw = await request.text();
  if (!verify(raw, request.headers.get("x-hotelvideo-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  try {
    if (payload.type === "service_request") {
      const guestId = await resolveGuestId(payload.guest);
      const description = [payload.body, payload.summary && `\n\n— ${payload.summary}`]
        .filter(Boolean)
        .join("");
      const ticket = await db.ticket.create({
        data: {
          type: CATEGORY_TO_TICKET[payload.category] ?? "GUEST_REQUEST",
          title: payload.title ?? "Concierge request",
          description: description || null,
          guestId,
        },
        select: { id: true },
      });
      return NextResponse.json({ ok: true, ticketId: ticket.id });
    }

    if (payload.type === "profile_update") {
      const g: Guest = payload.guest ?? {};
      if (!g.email) return NextResponse.json({ ok: false, error: "guest email required" }, { status: 400 });
      const name = [g.firstName, g.lastName].filter(Boolean).join(" ");
      const notes = payload.fields
        ? Object.entries(payload.fields as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n")
        : undefined;
      const guest = await db.guest.upsert({
        where: { email: g.email },
        update: { ...(name ? { name } : {}), ...(g.phone ? { phone: g.phone } : {}), ...(notes ? { notes } : {}) },
        create: { email: g.email, name: name || g.email, phone: g.phone ?? null, notes: notes ?? null },
        select: { id: true },
      });
      return NextResponse.json({ ok: true, guestId: guest.id });
    }

    return NextResponse.json({ ok: true, ignored: payload.type });
  } catch (error) {
    console.error("[concierge webhook]", error);
    return NextResponse.json({ ok: false }, { status: 500 }); // sender may retry
  }
}
