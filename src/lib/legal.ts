// Terms of use, privacy notice and cookie policy, and the wording of the cookie choice.
// Bodies are Markdown for <Prose>: paragraphs and "## " headings only.
import type { Locale } from "./i18n";
import { contact } from "./site";

export const DOCS = ["terms", "privacy", "cookies"] as const;
export type Doc = (typeof DOCS)[number];
export const UPDATED = "2026-11-15";

const who = `Ephyria Lux, Εξαμίλια 20150 Κόρινθος, ${contact.phone}, ${contact.email}`;
const whoEn = `Ephyria Lux, Examilia 20150 Corinth, Greece, ${contact.phone}, ${contact.email}`;

export const LEGAL: Record<Locale, Record<Doc, { title: string; lead: string; body: string }>> = {
  el: {
    terms: {
      title: "Όροι χρήσης",
      lead: "Οι όροι με τους οποίους χρησιμοποιείτε το site και κάνετε κράτηση στο Ephyria Lux.",
      body: `## Ποιοι είμαστε
Το site ανήκει στο ${who}. Χρησιμοποιώντας το, αποδέχεστε τους παρακάτω όρους.

## Χρήση του site
Τα κείμενα, οι φωτογραφίες, τα βίντεο και το λογότυπο ανήκουν στο Ephyria Lux ή στους δημιουργούς τους και δεν αναπαράγονται χωρίς άδεια. Οι πληροφορίες για την περιοχή δίνονται για γενική ενημέρωση· ωράρια και τιμές τρίτων μπορεί να αλλάξουν χωρίς να το γνωρίζουμε.

## Κράτηση και πληρωμή
Η διαθεσιμότητα που βλέπετε είναι σε πραγματικό χρόνο. Όταν ξεκινάτε την πληρωμή, κρατάμε τις ημερομηνίες σας για λίγα λεπτά. Η κράτηση επιβεβαιώνεται μόλις ολοκληρωθεί η πληρωμή και σας στέλνουμε επιβεβαίωση με email. Η πληρωμή γίνεται στην ασφαλή σελίδα της Viva Payments· δεν βλέπουμε και δεν αποθηκεύουμε τα στοιχεία της κάρτας σας.

## Τιμές
Οι τιμές είναι σε ευρώ. Το συνολικό ποσό, το ποσό που πληρώνετε online και το υπόλοιπο που εξοφλείται στην άφιξη εμφανίζονται πριν από την πληρωμή. Οι προαιρετικές υπηρεσίες χρεώνονται όπως αναγράφεται δίπλα στην καθεμία.

## Αλλαγές και ακυρώσεις
Για αλλαγή ημερομηνιών ή ακύρωση επικοινωνήστε μαζί μας στο ${contact.phone} ή στο ${contact.email}, αναφέροντας τον κωδικό της κράτησης. Ισχύουν οι όροι ακύρωσης που σας γνωστοποιούνται με την επιβεβαίωση της κράτησης.

## Η διαμονή σας
Κάθε βίλα φιλοξενεί έως τον αριθμό ατόμων που αναγράφεται στη σελίδα της. Παρακαλούμε να σέβεστε τον χώρο, τον εξοπλισμό και την ησυχία της γειτονιάς. Ζημιές πέρα από τη φυσιολογική χρήση βαρύνουν τον επισκέπτη που έκανε την κράτηση.

## Ευθύνη
Φροντίζουμε το site να είναι ακριβές και διαθέσιμο, αλλά δεν ευθυνόμαστε για διακοπές λειτουργίας ή για περιεχόμενο τρίτων ιστοσελίδων στις οποίες παραπέμπουμε.

## Εφαρμοστέο δίκαιο
Οι όροι διέπονται από το ελληνικό δίκαιο. Αρμόδια είναι τα δικαστήρια της Κορίνθου. Μπορεί να ενημερώσουμε τους όρους· ισχύει η έκδοση που είναι αναρτημένη την ημέρα της κράτησής σας.`,
    },
    privacy: {
      title: "Πολιτική απορρήτου",
      lead: "Ποια στοιχεία σας συλλέγουμε, γιατί, και τι δικαιώματα έχετε.",
      body: `## Υπεύθυνος επεξεργασίας
${who}.

## Ποια στοιχεία συλλέγουμε
Όταν κάνετε κράτηση: ονοματεπώνυμο, email, τηλέφωνο, ημερομηνίες, αριθμό επισκεπτών και ό,τι σημειώσετε εσείς. Όταν μας γράφετε από τη φόρμα επικοινωνίας ή τη σελίδα «Κατά τη διαμονή»: τα στοιχεία επικοινωνίας και το μήνυμά σας. Τα στοιχεία της κάρτας τα δίνετε μόνο στη Viva Payments και δεν φτάνουν ποτέ σε εμάς. Μετρήσεις επισκεψιμότητας συλλέγονται μόνο αν το επιτρέψετε.

## Γιατί τα χρησιμοποιούμε
Για να εκτελέσουμε την κράτησή σας και να επικοινωνήσουμε μαζί σας (εκτέλεση σύμβασης). Για να τηρήσουμε φορολογικές και λογιστικές υποχρεώσεις (νομική υποχρέωση). Για να απαντήσουμε σε αιτήματα και να προστατεύσουμε το site (έννομο συμφέρον). Για στατιστικά και διαφημίσεις, μόνο με τη συγκατάθεσή σας, την οποία αλλάζετε όποτε θέλετε από τις «Ρυθμίσεις cookies».

## Ποιοι τα λαμβάνουν
Συνεργάτες που μας εξυπηρετούν και δεσμεύονται με σύμβαση: Viva Payments για τις πληρωμές, Mailgun για την αποστολή email, Bunny για τη διανομή φωτογραφιών και βίντεο, ο πάροχος φιλοξενίας του site και, μόνο με τη συγκατάθεσή σας, η Google για μετρήσεις και διαφημίσεις. Ορισμένοι μπορεί να επεξεργάζονται δεδομένα εκτός Ευρωπαϊκής Ένωσης, με τις εγγυήσεις που προβλέπει ο Γενικός Κανονισμός. Δεν πουλάμε τα στοιχεία σας.

## Πόσο τα κρατάμε
Τα στοιχεία κρατήσεων όσο απαιτεί η φορολογική και λογιστική νομοθεσία. Τα μηνύματα επικοινωνίας όσο χρειάζεται για να σας εξυπηρετήσουμε.

## Τα δικαιώματά σας
Μπορείτε να ζητήσετε πρόσβαση, διόρθωση, διαγραφή, περιορισμό ή φορητότητα των στοιχείων σας, να αντιταχθείτε στην επεξεργασία και να ανακαλέσετε τη συγκατάθεσή σας. Γράψτε μας στο ${contact.email}. Αν θεωρείτε ότι δεν σας απαντήσαμε σωστά, μπορείτε να απευθυνθείτε στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (dpa.gr).`,
    },
    cookies: {
      title: "Πολιτική cookies",
      lead: "Τι αποθηκεύει το site στη συσκευή σας και πώς το ελέγχετε.",
      body: `## Τι είναι
Cookies και παρόμοιες τεχνολογίες είναι μικρά αρχεία που αποθηκεύονται στη συσκευή σας. Κάποια είναι απαραίτητα για να δουλέψει το site· τα υπόλοιπα φορτώνουν μόνο αν το επιτρέψετε.

## Απαραίτητα
Θυμούνται την επιλογή σας για τα cookies και την προτίμησή σας για μειωμένη κίνηση, και ότι έχετε ήδη δει την εισαγωγή της αρχικής σελίδας. Δεν σας παρακολουθούν και δεν απενεργοποιούνται.

## Στατιστικά
Με τη συγκατάθεσή σας, το Google Analytics μετρά ανώνυμα ποιες σελίδες διαβάζονται, για να βελτιώνουμε το site. Χρησιμοποιεί cookies όπως το _ga, που διαρκούν έως δύο χρόνια.

## Διαφήμιση
Με τη συγκατάθεσή σας, το Google Ads μετρά αν μια διαφήμιση οδήγησε σε κράτηση. Χρησιμοποιεί cookies όπως το _gcl_au, που διαρκούν έως τρεις μήνες.

## Τρίτοι
Η πληρωμή γίνεται στη σελίδα της Viva Payments, που έχει τη δική της πολιτική cookies. Οι χάρτες και τα αρχεία πολυμέσων φορτώνουν από εξωτερικούς διακομιστές χωρίς cookies.

## Πώς αλλάζετε την επιλογή σας
Πατήστε «Ρυθμίσεις cookies» στο κάτω μέρος κάθε σελίδας. Μπορείτε επίσης να διαγράψετε τα cookies από τις ρυθμίσεις του browser σας.`,
    },
  },
  en: {
    terms: {
      title: "Terms of use",
      lead: "The terms on which you use this site and book a stay at Ephyria Lux.",
      body: `## Who we are
This site belongs to ${whoEn}. By using it you accept the terms below.

## Using the site
The texts, photographs, films and logo belong to Ephyria Lux or to their authors and may not be reproduced without permission. Information about the region is given for general guidance; opening hours and prices of third parties may change without our knowledge.

## Booking and payment
The availability you see is live. When you start paying, we hold your dates for a few minutes. The booking is confirmed once the payment is completed, and we send you a confirmation by email. Payment takes place on the secure page of Viva Payments; we never see or store your card details.

## Prices
Prices are in euros. The total, the amount you pay online and the balance settled on arrival are shown before payment. Optional services are charged as stated next to each one.

## Changes and cancellations
To change dates or cancel, contact us at ${contact.phone} or ${contact.email} and quote your booking code. The cancellation terms given to you with the booking confirmation apply.

## Your stay
Each villa sleeps up to the number of guests stated on its page. Please respect the house, its equipment and the quiet of the neighbourhood. Damage beyond normal use is charged to the guest who made the booking.

## Liability
We work to keep the site accurate and available, but we are not liable for interruptions or for the content of third-party sites we link to.

## Governing law
These terms are governed by Greek law. The courts of Corinth have jurisdiction. We may update the terms; the version published on the day of your booking applies.`,
    },
    privacy: {
      title: "Privacy notice",
      lead: "What personal data we collect, why, and what rights you have.",
      body: `## Data controller
${whoEn}.

## What we collect
When you book: name, email, phone, dates, number of guests and anything you choose to tell us. When you write to us through the contact form or the "During your stay" page: your contact details and your message. You give your card details only to Viva Payments; they never reach us. Visit statistics are collected only if you allow them.

## Why we use it
To carry out your booking and contact you (performance of a contract). To meet tax and accounting duties (legal obligation). To answer requests and protect the site (legitimate interest). For statistics and advertising, only with your consent, which you can change at any time under "Cookie settings".

## Who receives it
Partners who work for us under contract: Viva Payments for payments, Mailgun for sending email, Bunny for delivering photographs and films, the site's hosting provider and, only with your consent, Google for measurement and advertising. Some may process data outside the European Union, under the safeguards the GDPR provides. We do not sell your data.

## How long we keep it
Booking records for as long as tax and accounting law requires. Messages for as long as needed to help you.

## Your rights
You may ask for access, correction, deletion, restriction or portability of your data, object to processing and withdraw your consent. Write to ${contact.email}. If you believe we did not answer properly, you may contact the Hellenic Data Protection Authority (dpa.gr).`,
    },
    cookies: {
      title: "Cookie policy",
      lead: "What the site stores on your device and how you control it.",
      body: `## What they are
Cookies and similar technologies are small files stored on your device. Some are needed for the site to work; the rest load only if you allow them.

## Necessary
They remember your cookie choice and your reduced-motion preference, and that you have already seen the home page introduction. They do not track you and cannot be switched off.

## Statistics
With your consent, Google Analytics counts anonymously which pages are read, so we can improve the site. It uses cookies such as _ga, which last up to two years.

## Advertising
With your consent, Google Ads measures whether an advertisement led to a booking. It uses cookies such as _gcl_au, which last up to three months.

## Third parties
Payment takes place on the page of Viva Payments, which has its own cookie policy. Maps and media files load from external servers without cookies.

## Changing your choice
Select "Cookie settings" at the bottom of any page. You can also delete cookies in your browser settings.`,
    },
  },
  de: {
    terms: {
      title: "Nutzungsbedingungen",
      lead: "Die Bedingungen für die Nutzung dieser Website und für Ihre Buchung im Ephyria Lux.",
      body: `## Wer wir sind
Diese Website gehört ${whoEn}. Mit der Nutzung akzeptieren Sie die folgenden Bedingungen.

## Nutzung der Website
Texte, Fotos, Filme und Logo gehören Ephyria Lux oder ihren Urhebern und dürfen ohne Erlaubnis nicht wiedergegeben werden. Angaben zur Region dienen der allgemeinen Orientierung; Öffnungszeiten und Preise Dritter können sich ohne unser Wissen ändern.

## Buchung und Zahlung
Die angezeigte Verfügbarkeit ist aktuell. Sobald Sie die Zahlung beginnen, halten wir Ihre Daten für einige Minuten frei. Die Buchung ist bestätigt, wenn die Zahlung abgeschlossen ist; Sie erhalten eine Bestätigung per E-Mail. Die Zahlung erfolgt auf der sicheren Seite von Viva Payments; Ihre Kartendaten sehen und speichern wir nie.

## Preise
Die Preise verstehen sich in Euro. Gesamtbetrag, online zu zahlender Betrag und der bei Anreise fällige Rest werden vor der Zahlung angezeigt. Zusatzleistungen werden wie jeweils angegeben berechnet.

## Änderungen und Stornierungen
Für Terminänderungen oder Stornierungen erreichen Sie uns unter ${contact.phone} oder ${contact.email}; bitte nennen Sie Ihren Buchungscode. Es gelten die Stornobedingungen, die Ihnen mit der Buchungsbestätigung mitgeteilt werden.

## Ihr Aufenthalt
Jede Villa bietet Platz für die auf ihrer Seite genannte Personenzahl. Bitte achten Sie auf das Haus, seine Ausstattung und die Ruhe der Nachbarschaft. Schäden über die normale Nutzung hinaus trägt der Gast, der gebucht hat.

## Haftung
Wir bemühen uns um eine korrekte und verfügbare Website, haften jedoch nicht für Unterbrechungen oder für Inhalte verlinkter Seiten Dritter.

## Anwendbares Recht
Es gilt griechisches Recht. Zuständig sind die Gerichte von Korinth. Wir können die Bedingungen aktualisieren; es gilt die am Tag Ihrer Buchung veröffentlichte Fassung.`,
    },
    privacy: {
      title: "Datenschutzerklärung",
      lead: "Welche personenbezogenen Daten wir erheben, wozu, und welche Rechte Sie haben.",
      body: `## Verantwortlicher
${whoEn}.

## Welche Daten wir erheben
Bei einer Buchung: Name, E-Mail, Telefon, Reisedaten, Gästezahl und was Sie uns zusätzlich mitteilen. Wenn Sie uns über das Kontaktformular oder die Seite „Während Ihres Aufenthalts“ schreiben: Ihre Kontaktdaten und Ihre Nachricht. Kartendaten geben Sie nur bei Viva Payments ein; sie erreichen uns nie. Besuchsstatistiken werden nur mit Ihrer Erlaubnis erhoben.

## Wozu wir sie nutzen
Zur Durchführung Ihrer Buchung und zur Kommunikation mit Ihnen (Vertragserfüllung). Zur Erfüllung steuerlicher und buchhalterischer Pflichten (rechtliche Verpflichtung). Zur Beantwortung von Anfragen und zum Schutz der Website (berechtigtes Interesse). Für Statistik und Werbung nur mit Ihrer Einwilligung, die Sie jederzeit unter „Cookie-Einstellungen“ ändern können.

## Wer sie erhält
Vertraglich gebundene Dienstleister: Viva Payments für Zahlungen, Mailgun für den E-Mail-Versand, Bunny für die Auslieferung von Fotos und Filmen, der Hosting-Anbieter der Website und, nur mit Ihrer Einwilligung, Google für Messung und Werbung. Einige können Daten außerhalb der Europäischen Union verarbeiten, mit den Garantien der DSGVO. Wir verkaufen Ihre Daten nicht.

## Wie lange wir sie aufbewahren
Buchungsdaten so lange, wie es Steuer- und Buchhaltungsrecht verlangen. Nachrichten so lange, wie es für Ihr Anliegen nötig ist.

## Ihre Rechte
Sie können Auskunft, Berichtigung, Löschung, Einschränkung oder Übertragbarkeit Ihrer Daten verlangen, der Verarbeitung widersprechen und Ihre Einwilligung widerrufen. Schreiben Sie an ${contact.email}. Wenn Sie meinen, wir hätten nicht angemessen geantwortet, können Sie sich an die griechische Datenschutzbehörde wenden (dpa.gr).`,
    },
    cookies: {
      title: "Cookie-Richtlinie",
      lead: "Was die Website auf Ihrem Gerät speichert und wie Sie es steuern.",
      body: `## Was das ist
Cookies und ähnliche Techniken sind kleine Dateien auf Ihrem Gerät. Einige sind für den Betrieb der Website nötig; die übrigen werden nur geladen, wenn Sie es erlauben.

## Notwendig
Sie merken sich Ihre Cookie-Auswahl und Ihre Einstellung für reduzierte Bewegung sowie, dass Sie die Einleitung der Startseite bereits gesehen haben. Sie verfolgen Sie nicht und lassen sich nicht abschalten.

## Statistik
Mit Ihrer Einwilligung zählt Google Analytics anonym, welche Seiten gelesen werden, damit wir die Website verbessern können. Es verwendet Cookies wie _ga mit einer Laufzeit von bis zu zwei Jahren.

## Werbung
Mit Ihrer Einwilligung misst Google Ads, ob eine Anzeige zu einer Buchung geführt hat. Es verwendet Cookies wie _gcl_au mit einer Laufzeit von bis zu drei Monaten.

## Dritte
Die Zahlung erfolgt auf der Seite von Viva Payments mit eigener Cookie-Richtlinie. Karten und Mediendateien werden ohne Cookies von externen Servern geladen.

## Auswahl ändern
Wählen Sie „Cookie-Einstellungen“ am Ende jeder Seite. Sie können Cookies auch in den Einstellungen Ihres Browsers löschen.`,
    },
  },
};

/** Wording of the cookie banner, the settings dialog and the footer links. */
export const CONSENT_UI: Record<Locale, {
  label: string; text: string; acceptAll: string; onlyNecessary: string; settings: string; save: string; close: string; title: string; intro: string; always: string;
  necessary: [string, string]; analytics: [string, string]; ads: [string, string]; more: string; updated: string;
}> = {
  el: {
    label: "Επιλογή cookies", text: "Χρησιμοποιούμε cookies για στατιστικά και διαφημίσεις της Google. Φορτώνουν μόνο αν τα αποδεχτείτε.",
    acceptAll: "Αποδοχή όλων", onlyNecessary: "Μόνο τα απαραίτητα", settings: "Ρυθμίσεις cookies", save: "Αποθήκευση επιλογών", close: "Κλείσιμο",
    title: "Ρυθμίσεις cookies", intro: "Διαλέξτε τι επιτρέπετε. Μπορείτε να αλλάξετε γνώμη όποτε θέλετε από το κάτω μέρος κάθε σελίδας.", always: "Πάντα ενεργά",
    necessary: ["Απαραίτητα", "Θυμούνται τις επιλογές σας και κρατούν το site σε λειτουργία. Δεν σας παρακολουθούν."],
    analytics: ["Στατιστικά", "Το Google Analytics μετρά ανώνυμα ποιες σελίδες διαβάζονται, για να βελτιώνουμε το site."],
    ads: ["Διαφήμιση", "Το Google Ads μετρά αν μια διαφήμιση οδήγησε σε κράτηση και προσαρμόζει τις διαφημίσεις που βλέπετε."],
    more: "Περισσότερα στην", updated: "Τελευταία ενημέρωση",
  },
  en: {
    label: "Cookie choice", text: "We use cookies for Google statistics and advertising. They load only if you accept them.",
    acceptAll: "Accept all", onlyNecessary: "Necessary only", settings: "Cookie settings", save: "Save choices", close: "Close",
    title: "Cookie settings", intro: "Choose what you allow. You can change your mind at any time from the bottom of any page.", always: "Always on",
    necessary: ["Necessary", "They remember your choices and keep the site working. They do not track you."],
    analytics: ["Statistics", "Google Analytics counts anonymously which pages are read, so we can improve the site."],
    ads: ["Advertising", "Google Ads measures whether an advertisement led to a booking and tailors the ads you see."],
    more: "More in the", updated: "Last updated",
  },
  de: {
    label: "Cookie-Auswahl", text: "Wir verwenden Cookies für Statistik und Werbung von Google. Sie werden nur geladen, wenn Sie zustimmen.",
    acceptAll: "Alle akzeptieren", onlyNecessary: "Nur notwendige", settings: "Cookie-Einstellungen", save: "Auswahl speichern", close: "Schließen",
    title: "Cookie-Einstellungen", intro: "Wählen Sie, was Sie erlauben. Sie können Ihre Meinung jederzeit am Ende jeder Seite ändern.", always: "Immer aktiv",
    necessary: ["Notwendig", "Sie merken sich Ihre Auswahl und halten die Website in Betrieb. Sie verfolgen Sie nicht."],
    analytics: ["Statistik", "Google Analytics zählt anonym, welche Seiten gelesen werden, damit wir die Website verbessern können."],
    ads: ["Werbung", "Google Ads misst, ob eine Anzeige zu einer Buchung geführt hat, und passt die Anzeigen an, die Sie sehen."],
    more: "Mehr in der", updated: "Zuletzt aktualisiert",
  },
};
