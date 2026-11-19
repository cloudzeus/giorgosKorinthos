"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { concierge } from "@/lib/site";

/** Whether a concierge is online in the hotelVideo app right now. null while unknown. Re-checked every 30s. */
export function usePresence() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    if (!concierge.companyId) return;
    let alive = true;
    const check = () =>
      fetch(`${concierge.url}/api/public/operator-status?companyId=${encodeURIComponent(concierge.companyId)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => alive && setOnline(!!d.online))
        .catch(() => alive && setOnline(false));
    check();
    const timer = setInterval(check, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return online;
}

/** Button to the video concierge page, with a live dot while a concierge is online. Renders nothing when the concierge is not configured. */
export default function ConciergeLink({ href, label, onlineLabel, className = "mr-btn" }: { href: string; label: string; onlineLabel: string; className?: string }) {
  const online = usePresence();
  if (!concierge.companyId) return null;
  return (
    <Link className={`${className} cc-link`} href={href}>
      <Video aria-hidden="true" strokeWidth={1.5} />
      {label}
      {online ? <><span className="cc-dot" data-on="" aria-hidden="true" /><span className="mr-sr">{onlineLabel}</span></> : null}
    </Link>
  );
}
