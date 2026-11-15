// Server-rendered forms shared by several admin pages.
import type { Guest, Ticket, Unit, User } from "@prisma/client";
import { Button } from "@/components/dg/button";
import { dayString } from "@/lib/booking";
import { unitLabel } from "./parts";

export function GuestForm({ guest, action }: { guest?: Guest; action: (formData: FormData) => Promise<void> }) {
  const id = guest?.id ?? "new";
  return (
    <form className="ad-form" action={action}>
      <div className="ad-field"><label htmlFor={`g-name-${id}`}>Ονοματεπώνυμο</label><input id={`g-name-${id}`} name="name" defaultValue={guest?.name} required /></div>
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`g-email-${id}`}>Email</label><input id={`g-email-${id}`} name="email" type="email" defaultValue={guest?.email} required /></div>
        <div className="ad-field"><label htmlFor={`g-phone-${id}`}>Τηλέφωνο</label><input id={`g-phone-${id}`} name="phone" type="tel" defaultValue={guest?.phone ?? ""} /></div>
      </div>
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`g-country-${id}`}>Χώρα</label><input id={`g-country-${id}`} name="country" defaultValue={guest?.country ?? ""} /></div>
        <div className="ad-field"><label htmlFor={`g-lang-${id}`}>Γλώσσα επικοινωνίας</label><select id={`g-lang-${id}`} name="language" defaultValue={guest?.language ?? "el"}><option value="el">Ελληνικά</option><option value="en">Αγγλικά</option><option value="de">Γερμανικά</option></select></div>
      </div>
      <div className="ad-field"><label htmlFor={`g-notes-${id}`}>Προτιμήσεις και σημειώσεις</label><textarea id={`g-notes-${id}`} name="notes" defaultValue={guest?.notes ?? ""} /><small>Αλλεργίες, αγαπημένη βίλα, ό,τι αξίζει να θυμάστε την επόμενη φορά.</small></div>
      <fieldset className="ad-checks">
        <label><input type="checkbox" name="vip" defaultChecked={guest?.vip} />Σημαντικός πελάτης (VIP)</label>
        <label><input type="checkbox" name="marketingConsent" defaultChecked={guest?.marketingConsent} />Έχει συμφωνήσει να λαμβάνει ενημερώσεις και προσφορές</label>
      </fieldset>
      <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
    </form>
  );
}

const TYPES = [["CLEANING", "Καθαριότητα"], ["GUEST_REQUEST", "Αίτημα πελάτη"], ["MAINTENANCE", "Συντήρηση"], ["DAMAGE", "Ζημιά"]] as const;

export function TicketForm({ ticket, defaultType, units, staff, action }: {
  ticket?: Ticket; defaultType: string; units: Unit[]; staff: Pick<User, "id" | "name">[]; action: (formData: FormData) => Promise<void>;
}) {
  const id = ticket?.id ?? "new";
  const type = ticket?.type ?? defaultType;
  const money = type === "DAMAGE" || type === "MAINTENANCE";
  return (
    <form className="ad-form" action={action}>
      <input type="hidden" name="reservationId" value={ticket?.reservationId ?? ""} /><input type="hidden" name="guestId" value={ticket?.guestId ?? ""} />
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`t-type-${id}`}>Είδος</label><select id={`t-type-${id}`} name="type" defaultValue={type}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="ad-field"><label htmlFor={`t-unit-${id}`}>Βίλα</label><select id={`t-unit-${id}`} name="unitId" defaultValue={ticket?.unitId ?? ""}><option value="">Κοινόχρηστος χώρος ή όλο το κτήμα</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit.slug)}</option>)}</select></div>
      </div>
      <div className="ad-field"><label htmlFor={`t-title-${id}`}>Τίτλος</label><input id={`t-title-${id}`} name="title" defaultValue={ticket?.title} required /></div>
      <div className="ad-field"><label htmlFor={`t-desc-${id}`}>Περιγραφή</label><textarea id={`t-desc-${id}`} name="description" defaultValue={ticket?.description ?? ""} /></div>
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`t-due-${id}`}>Προθεσμία</label><input id={`t-due-${id}`} name="dueDate" type="date" defaultValue={ticket?.dueDate ? dayString(ticket.dueDate) : ""} /></div>
        <div className="ad-field"><label htmlFor={`t-prio-${id}`}>Προτεραιότητα</label><select id={`t-prio-${id}`} name="priority" defaultValue={ticket?.priority ?? "NORMAL"}><option value="LOW">Χαμηλή</option><option value="NORMAL">Κανονική</option><option value="HIGH">Επείγον</option></select></div>
      </div>
      <div className="ad-form__row">
        <div className="ad-field"><label htmlFor={`t-who-${id}`}>Ανάθεση σε</label><select id={`t-who-${id}`} name="assigneeId" defaultValue={ticket?.assigneeId ?? ""}><option value="">Κανέναν ακόμη</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
        <div className="ad-field"><label htmlFor={`t-status-${id}`}>Κατάσταση</label><select id={`t-status-${id}`} name="status" defaultValue={ticket?.status ?? "OPEN"}><option value="OPEN">Ανοιχτό</option><option value="IN_PROGRESS">Σε εξέλιξη</option><option value="DONE">Ολοκληρώθηκε</option><option value="CANCELLED">Ακυρώθηκε</option></select></div>
      </div>
      {money || !ticket ? (
        <>
          <div className="ad-field"><label htmlFor={`t-cost-${id}`}>Κόστος επισκευής ή αντικατάστασης (€)</label><input id={`t-cost-${id}`} name="cost" inputMode="decimal" defaultValue={ticket?.costCents ? (ticket.costCents / 100).toString() : ""} /></div>
          <fieldset className="ad-checks"><label><input type="checkbox" name="chargedToGuest" defaultChecked={ticket?.chargedToGuest} />Χρεώνεται στον πελάτη</label></fieldset>
        </>
      ) : null}
      <div className="ad-form__foot"><Button variant="primary" type="submit">Αποθήκευση</Button></div>
    </form>
  );
}
