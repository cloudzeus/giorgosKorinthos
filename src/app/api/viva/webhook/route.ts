import { NextResponse } from "next/server";
import { settleTransaction } from "@/lib/payments";
import { webhookKey } from "@/lib/viva";

// Viva calls GET once to verify the URL and expects the merchant's webhook key back.
export async function GET() {
  try {
    return NextResponse.json({ Key: await webhookKey() });
  } catch (error) {
    console.error("[viva webhook] verification failed:", error);
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
}

// Transaction Payment Created (1796). The body is not signed, so it is only a hint:
// settleTransaction asks Viva's API for the transaction before anything is confirmed.
export async function POST(request: Request) {
  const event = (await request.json().catch(() => null)) as { EventTypeId?: number; EventData?: { TransactionId?: string } } | null;
  const transactionId = event?.EventData?.TransactionId;
  if (event?.EventTypeId === 1796 && typeof transactionId === "string") {
    try {
      await settleTransaction(transactionId);
    } catch (error) {
      console.error("[viva webhook]", error);
      return NextResponse.json({ ok: false }, { status: 500 }); // Viva retries on a non-200
    }
  }
  return NextResponse.json({ ok: true });
}
