import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/dg/button";
import { Badge } from "@/components/dg/badge";
import { FormModal } from "@/components/admin/client";
import { GuestForm } from "@/components/admin/forms";
import { Alert, PageHead, SortHead, day, eur } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveGuest } from "../../ops-actions";

export const metadata = { title: "Πελάτες" };

export default async function GuestsPage({ searchParams }: PageProps<"/admin/guests">) {
  const user = await requirePermission("crm.read");
  const query = await searchParams;
  const q = String(query.q ?? "").trim().slice(0, 80);
  const sort = query.sort === "created" ? "createdAt" : "name";
  const dir = query.dir === "desc" ? "desc" : "asc";
  const where: Prisma.GuestWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {};
  const guests = await db.guest.findMany({ where, orderBy: { [sort]: dir }, take: 200, include: { reservations: { where: { status: "CONFIRMED" }, select: { totalCents: true, checkOut: true } } } });
  const write = can(user.role, "crm.write");
  const base = `/admin/guests?q=${encodeURIComponent(q)}`;
  return (
    <>
      <PageHead title="Πελάτες" text="Κάθε άνθρωπος που έκλεισε, ρώτησε ή έστειλε μήνυμα. Ανοίξτε την καρτέλα του για ιστορικό διαμονών, σημειώσεις και αιτήματα.">
        {write ? <FormModal trigger={<><Plus size={16} strokeWidth={1.5} aria-hidden="true" />Νέος πελάτης</>} title="Νέος πελάτης"><GuestForm action={saveGuest.bind(null, null)} /></FormModal> : null}
      </PageHead>
      {query.error ? <Alert bad>Δώστε ονοματεπώνυμο και έγκυρο email.</Alert> : null}
      <form className="ad-search" action="/admin/guests" role="search">
        <label htmlFor="q" className="sr-only">Αναζήτηση πελάτη</label>
        <Search size={16} strokeWidth={1.5} aria-hidden="true" />
        <input id="q" name="q" defaultValue={q} placeholder="Όνομα, email ή τηλέφωνο" />
        <Button variant="secondary" type="submit">Αναζήτηση</Button>
      </form>
      <section className="ad-card">
        {guests.length === 0 ? <p className="ad-empty">{q ? "Κανένας πελάτης δεν ταιριάζει. Δοκιμάστε άλλη λέξη." : "Δεν υπάρχει πελάτης ακόμη. Θα προστεθούν αυτόματα με την πρώτη κράτηση ή μήνυμα."}</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow>
              <TableHead><SortHead field="name" label="Πελάτης" sort={sort === "name" ? "name" : "created"} dir={dir} base={base} /></TableHead>
              <TableHead className="ad-hide">Τηλέφωνο</TableHead><TableHead>Διαμονές</TableHead><TableHead className="ad-hide">Έχει ξοδέψει</TableHead><TableHead className="ad-hide">Τελευταία διαμονή</TableHead>
            </TableRow></TableHeader>
            <TableBody>{guests.map((guest) => {
              const last = guest.reservations.map((row) => row.checkOut).sort((a, b) => b.getTime() - a.getTime())[0];
              return (
                <TableRow key={guest.id}>
                  <TableCell><Link href={`/admin/guests/${guest.id}`}><strong>{guest.name}</strong></Link>{guest.vip ? <> <Badge variant="purple">VIP</Badge></> : null}<br /><span className="ad-stat__note">{guest.email}</span></TableCell>
                  <TableCell className="ad-hide">{guest.phone ?? "-"}</TableCell>
                  <TableCell>{guest.reservations.length}{guest.reservations.length > 1 ? <> <Badge variant="success">Επαναλαμβανόμενος</Badge></> : null}</TableCell>
                  <TableCell className="ad-hide">{eur(guest.reservations.reduce((sum, row) => sum + row.totalCents, 0))}</TableCell>
                  <TableCell className="ad-hide">{last ? day(last) : "-"}</TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
