"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { concierge } from "@/lib/site";

// Site palette handed to the hotelVideo room, so the call looks like part of this site.
const THEME = { primary: "#343F35", bg: "#F6F3ED", card: "#FAF8F5", text: "#262824", line: "#E5DDD0", stage: "#262824" };

/** The video call of a confirmed meeting, in a modal over the concierge page. The room itself is the hotelVideo app in an iframe. */
export default function ConciergeCall({ room, title, closeLabel, hotelName, backHref }: { room: string; title: string; closeLabel: string; hotelName: string; backHref: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => { ref.current?.showModal(); }, []);
  const query = new URLSearchParams({ name: hotelName, companyId: concierge.companyId, ...THEME });
  return (
    // Escape is ignored on purpose: one stray key press must not hang up a call. Only the button closes.
    <dialog ref={ref} className="cc-call" aria-label={title} onCancel={(e) => e.preventDefault()} onClose={() => router.replace(backHref, { scroll: false })}>
      <header>
        <strong>{title}</strong>
        <button className="mr-btn mr-btn--secondary" type="button" onClick={() => ref.current?.close()}><X aria-hidden="true" strokeWidth={1.5} />{closeLabel}</button>
      </header>
      <iframe src={`${concierge.url}/room/${room}?${query}`} title={title} allow="camera; microphone; autoplay; fullscreen; display-capture" />
    </dialog>
  );
}
