import Link from "next/link";
import { Film, ImageIcon } from "lucide-react";
import { can, requirePermission } from "@/auth";
import { db } from "@/lib/db";
import { bunnyConfigured } from "@/lib/bunny";
import { SLOTS } from "@/lib/media";
import { Badge } from "@/components/dg/badge";
import { Button } from "@/components/dg/button";
import { FormModal, RowMenu } from "@/components/admin/client";
import { MediaUploader } from "@/components/admin/uploader";
import { Alert, PageHead, stamp } from "@/components/admin/parts";
import { deleteMedia, updateMedia } from "../../actions";

export const metadata = { title: "Βιβλιοθήκη μέσων" };

const FOLDERS = [
  { id: "images/villas", label: "Φωτογραφίες από τις βίλες" },
  { id: "images/places", label: "Φωτογραφίες από την περιοχή" },
  { id: "images/gallery", label: "Γενικές φωτογραφίες" },
  { id: "videos", label: "Βίντεο" },
];
const size = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`);

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const user = await requirePermission("media.read");
  const query = await searchParams;
  const kind = query.kind === "VIDEO" ? "VIDEO" : query.kind === "IMAGE" ? "IMAGE" : undefined;
  const assets = await db.mediaAsset.findMany({ where: kind ? { kind } : undefined, orderBy: { createdAt: "desc" }, take: 300 });
  const write = can(user.role, "media.write");
  const ready = await bunnyConfigured();
  const local = assets.filter((asset) => !asset.url.startsWith("http")).length;
  const slotLabel = (id: string | null) => SLOTS.find((slot) => slot.id === id)?.label;

  return (
    <>
      <PageHead title="Βιβλιοθήκη μέσων" text="Φωτογραφίες και βίντεο του site. Αποθηκεύονται στο Bunny CDN. Για να εμφανιστεί ένα αρχείο στο site, ορίστε του «Θέση» από την Επεξεργασία." />
      {!ready ? <Alert bad>Το Bunny CDN δεν είναι ρυθμισμένο, οπότε δεν μπορείτε να ανεβάσετε αρχεία. Συμπληρώστε τα στοιχεία του στις Ρυθμίσεις.</Alert> : null}
      {local ? <Alert bad>{local} αρχεία βρίσκονται μόνο σε αυτόν τον υπολογιστή και όχι στο CDN. Μετά τη ρύθμιση του Bunny τρέξτε ξανά το scripts/import-media.mjs για να ανέβουν.</Alert> : null}
      {query.ok ? <Alert>Οι αλλαγές αποθηκεύτηκαν.</Alert> : null}
      {query.error ? <Alert bad>Συμπληρώστε τίτλο και έγκυρη θέση.</Alert> : null}

      {write ? <MediaUploader folders={FOLDERS} disabled={!ready} /> : null}

      <nav className="ad-filters" aria-label="Είδος αρχείου" style={{ margin: "24px 0 16px" }}>
        <Link href="/admin/media" aria-current={!kind ? "true" : undefined}>Όλα ({assets.length})</Link>
        <Link href="/admin/media?kind=IMAGE" aria-current={kind === "IMAGE" ? "true" : undefined}>Φωτογραφίες</Link>
        <Link href="/admin/media?kind=VIDEO" aria-current={kind === "VIDEO" ? "true" : undefined}>Βίντεο</Link>
      </nav>

      {assets.length === 0 ? <p className="ad-card ad-empty">Δεν υπάρχει αρχείο ακόμη. Ανεβάστε το πρώτο από το πλαίσιο παραπάνω.</p> : (
        <ul className="ad-media">
          {assets.map((asset) => (
            <li className="ad-card ad-media__item" key={asset.id}>
              <div className="ad-media__thumb">
                {asset.kind === "VIDEO"
                  ? <video src={asset.url} poster={asset.poster ?? undefined} muted playsInline preload="none" controls />
                  : <img src={asset.url} alt="" loading="lazy" />}
              </div>
              <div className="ad-media__body">
                <p className="ad-media__title">{asset.kind === "VIDEO" ? <Film size={16} strokeWidth={1.5} aria-label="Βίντεο" /> : <ImageIcon size={16} strokeWidth={1.5} aria-label="Φωτογραφία" />}{asset.title}</p>
                <p className="ad-stat__note">{size(asset.bytes)}{asset.width ? ` · ${asset.width}×${asset.height}` : ""} · {stamp(asset.createdAt)}</p>
                <Badge variant={asset.slot ? "success" : "neutral"}>{asset.slot ? `Στο site: ${slotLabel(asset.slot) ?? asset.slot}` : "Δεν χρησιμοποιείται στο site"}</Badge>
                {write ? (
                  <div className="ad-media__actions">
                    <FormModal variant="secondary" trigger="Επεξεργασία" title={asset.title} description="Η «Θέση» ορίζει πού εμφανίζεται το αρχείο στο site. Κάθε θέση δέχεται ένα αρχείο.">
                      <form className="ad-form" action={updateMedia.bind(null, asset.id)}>
                        <div className="ad-field"><label htmlFor={`t-${asset.id}`}>Τίτλος</label><input id={`t-${asset.id}`} name="title" defaultValue={asset.title} required /></div>
                        <div className="ad-field"><label htmlFor={`c-${asset.id}`}>Αναφορά δημιουργού ή άδειας</label><input id={`c-${asset.id}`} name="credit" defaultValue={asset.credit ?? ""} /><small>Εμφανίζεται κάτω από την εικόνα. Αφήστε το κενό για δικό σας υλικό.</small></div>
                        <div className="ad-field">
                          <label htmlFor={`s-${asset.id}`}>Θέση στο site</label>
                          <select id={`s-${asset.id}`} name="slot" defaultValue={asset.slot ?? ""}>
                            <option value="">Καμία (μένει μόνο στη βιβλιοθήκη)</option>
                            {SLOTS.filter((slot) => slot.id.endsWith(asset.kind === "VIDEO" ? ".video" : ".photo")).map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                          </select>
                        </div>
                        <div className="ad-field"><label htmlFor={`u-${asset.id}`}>Διεύθυνση αρχείου</label><input id={`u-${asset.id}`} readOnly value={asset.url} /></div>
                        <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
                      </form>
                    </FormModal>
                    <RowMenu label={`Ενέργειες για ${asset.title}`} actions={[{ label: "Διαγραφή", action: deleteMedia.bind(null, asset.id), danger: true, confirm: "Το αρχείο θα διαγραφεί από τη βιβλιοθήκη και το CDN και θα φύγει από το site. Δεν αναιρείται. Συνέχεια;" }]} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
