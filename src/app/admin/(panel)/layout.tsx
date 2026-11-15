import Link from "next/link";
import { CalendarCheck, BedDouble, FileText, LayoutDashboard, LogOut, Mail } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { LogoHorizontal } from "@/components/site/Logo";
import { NavLink } from "@/components/admin/client";
import { logout } from "../actions";

const ROLE_LABEL = { SUPER_ADMIN: "Διαχειριστής", MANAGER: "Υπεύθυνος", RESERVATIONS: "Κρατήσεις", EDITOR: "Συντάκτης", AUDITOR: "Ελεγκτής" } as const;

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePermission("dashboard.read");
  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <Link className="ad-brand" href="/admin"><LogoHorizontal mono /><span>Διαχείριση</span></Link>
        <nav className="ad-nav" aria-label="Διαχείριση">
          <NavLink href="/admin" exact><LayoutDashboard aria-hidden="true" strokeWidth={1.5} /><span>Επισκόπηση</span></NavLink>
          {can(user.role, "reservations.read") ? <NavLink href="/admin/reservations"><CalendarCheck aria-hidden="true" strokeWidth={1.5} /><span>Κρατήσεις</span></NavLink> : null}
          {can(user.role, "reservations.read") ? <NavLink href="/admin/rooms"><BedDouble aria-hidden="true" strokeWidth={1.5} /><span>Βίλες και τιμές</span></NavLink> : null}
          {can(user.role, "content.read") ? <NavLink href="/admin/content"><FileText aria-hidden="true" strokeWidth={1.5} /><span>Περιεχόμενο</span></NavLink> : null}
          {can(user.role, "messages.read") ? <NavLink href="/admin/messages"><Mail aria-hidden="true" strokeWidth={1.5} /><span>Μηνύματα</span></NavLink> : null}
        </nav>
        <div className="ad-user">
          <p><strong>{user.name}</strong>{ROLE_LABEL[user.role]}</p>
          <form action={logout}><button type="submit" aria-label="Αποσύνδεση" title="Αποσύνδεση"><LogOut size={18} strokeWidth={1.5} aria-hidden="true" /></button></form>
        </div>
      </aside>
      <main className="ad-main">{children}</main>
    </div>
  );
}
