import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateArticle } from "@/lib/ai";

export const maxDuration = 300;

// Scheduled content: call with  Authorization: Bearer $CRON_SECRET  (e.g. twice a week from a cron job).
// Optional JSON body: { "topic": "..." } to write about a specific subject.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { topic?: string };
  try {
    const id = await generateArticle(typeof body.topic === "string" ? body.topic : undefined);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[cron] content generation failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}
