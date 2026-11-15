// Server-rendered admin building blocks.
import Link from "next/link";
import { ArrowDown, ArrowUp, CircleAlert, CircleCheck } from "lucide-react";
import { Badge } from "@/components/dg/badge";

export const eur = (cents: number) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const day = (date: Date) => new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
export const stamp = (date: Date) => new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" }).format(date);

export function PageHead({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <header className="ad-head">
      <div><h1>{title}</h1><p>{text}</p></div>
      {children ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div> : null}
    </header>
  );
}

export function Alert({ bad, children }: { bad?: boolean; children: React.ReactNode }) {
  return (
    <p className={bad ? "ad-alert ad-alert--bad" : "ad-alert"} role={bad ? "alert" : "status"}>
      {bad ? <CircleAlert aria-hidden="true" strokeWidth={1.5} /> : <CircleCheck aria-hidden="true" strokeWidth={1.5} />}
      <span>{children}</span>
    </p>
  );
}

/** Column header that sorts the table through the URL (?sort=field&dir=asc). */
export function SortHead({ field, label, sort, dir, base }: { field: string; label: string; sort: string; dir: string; base: string }) {
  const active = sort === field;
  const next = active && dir === "asc" ? "desc" : "asc";
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link href={`${base}${base.includes("?") ? "&" : "?"}sort=${field}&dir=${next}`} aria-label={`Ταξινόμηση κατά ${label}`}>
      {label}{active ? <Icon size={14} strokeWidth={1.5} aria-hidden="true" /> : null}
    </Link>
  );
}

const STATUS = {
  CONFIRMED: { variant: "success", label: "Επιβεβαιωμένη" },
  PENDING: { variant: "warning", label: "Αναμονή πληρωμής" },
  EXPIRED: { variant: "neutral", label: "Έληξε χωρίς πληρωμή" },
  CANCELLED: { variant: "danger", label: "Ακυρωμένη" },
  BLOCKED: { variant: "neutral", label: "Κλειστές ημερομηνίες" },
  PUBLISHED: { variant: "success", label: "Δημοσιευμένο" },
  DRAFT: { variant: "warning", label: "Πρόχειρο, θέλει έγκριση" },
  OPEN: { variant: "warning", label: "Ανοιχτό" },
  IN_PROGRESS: { variant: "info", label: "Σε εξέλιξη" },
  DONE: { variant: "success", label: "Ολοκληρώθηκε" },
  CLEANING: { variant: "neutral", label: "Καθαριότητα" },
  GUEST_REQUEST: { variant: "info", label: "Αίτημα πελάτη" },
  MAINTENANCE: { variant: "neutral", label: "Συντήρηση" },
  DAMAGE: { variant: "danger", label: "Ζημιά" },
  LOW: { variant: "neutral", label: "Χαμηλή" },
  NORMAL: { variant: "neutral", label: "Κανονική" },
  HIGH: { variant: "danger", label: "Επείγον" },
} as const;

export function Status({ value }: { value: keyof typeof STATUS }) {
  const { variant, label } = STATUS[value];
  return <Badge variant={variant}>{label}</Badge>;
}

import el from "@/i18n/el";
/** Greek villa label for the admin. */
export const unitLabel = (slug: string) => el.units[slug as keyof typeof el.units]?.name ?? `Παλιά εγγραφή (${slug})`;
