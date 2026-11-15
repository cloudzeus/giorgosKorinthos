import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/dg/badge";
import { RowMenu } from "@/components/admin/client";
import { PageHead, stamp } from "@/components/admin/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setInquiryHandled } from "../../actions";

export const metadata = { title: "Μηνύματα" };

export default async function MessagesPage() {
  const user = await requirePermission("messages.read");
  const rows = await db.inquiry.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 200 });
  const write = can(user.role, "messages.write");
  return (
    <>
      <PageHead title="Μηνύματα" text="Όσα έστειλαν οι επισκέπτες από τη φόρμα επικοινωνίας. Απαντήστε με email ή τηλέφωνο και σημειώστε το ως απαντημένο." />
      <section className="ad-card">
        {rows.length === 0 ? <p className="ad-empty">Κανένα μήνυμα ακόμη.</p> : (
          <Table className="ad-table">
            <TableHeader><TableRow><TableHead>Από</TableHead><TableHead>Μήνυμα</TableHead><TableHead>Κατάσταση</TableHead><TableHead><span className="sr-only">Ενέργειες</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><strong>{row.name}</strong><br /><a href={`mailto:${row.email}`}>{row.email}</a>{row.phone ? <><br /><a href={`tel:${row.phone}`}>{row.phone}</a></> : null}<br /><span className="ad-stat__note">{stamp(row.createdAt)} · {row.locale.toUpperCase()}</span></TableCell>
                  <TableCell style={{ whiteSpace: "pre-wrap", minWidth: 240 }}>{row.message}</TableCell>
                  <TableCell><Badge variant={row.handled ? "success" : "warning"}>{row.handled ? "Απαντήθηκε" : "Περιμένει απάντηση"}</Badge></TableCell>
                  <TableCell style={{ textAlign: "right" }}>
                    {write ? <RowMenu label={`Ενέργειες για το μήνυμα του ${row.name}`} actions={[{ label: row.handled ? "Σήμανση ως αναπάντητο" : "Σήμανση ως απαντημένο", action: setInquiryHandled.bind(null, row.id, !row.handled) }]} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
