"use client";
// Admin interaction primitives: add/edit forms open in a modal, row actions sit in a dropdown menu.
import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/dg/button";
import { cn } from "@/lib/utils";

/** A form in a modal. `children` is the server-rendered form; the modal closes when it is submitted. */
export function FormModal({ trigger, title, description, children, variant = "primary", wide }: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} />}>{trigger}</DialogTrigger>
      <DialogContent className={cn("max-h-[90dvh] overflow-y-auto rounded-[12px] p-6 sm:max-w-lg", wide && "sm:max-w-3xl")}>
        <DialogHeader>
          <DialogTitle className="text-xl font-medium" style={{ fontFamily: "var(--font-display)" }}>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div onSubmit={() => setOpen(false)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export interface RowAction {
  label: string;
  action: () => Promise<void>;
  danger?: boolean;
  /** Ask before running (destructive actions). */
  confirm?: string;
}

export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const [pending, start] = useTransition();
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={label} disabled={pending} className="min-h-11 min-w-11 px-0" />}>
        <MoreHorizontal size={18} strokeWidth={1.5} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {actions.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className={cn("min-h-10 cursor-pointer", item.danger && "text-danger-500")}
            onClick={() => { if (!item.confirm || window.confirm(item.confirm)) start(() => item.action()); }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Sidebar / top navigation link with the current page marked. */
export function NavLink({ href, children, exact }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("ad-nav__link", active && "is-active")}>
      {children}
    </Link>
  );
}
