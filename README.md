# Ephyria Lux

Ιστότοπος και σύστημα κρατήσεων για τη βίλα Ephyria Lux (Εξαμίλια, Κόρινθος).
Next.js 16 (App Router, server components), Tailwind CSS 4, shadcn/ui, Prisma, PostgreSQL πίσω από PgBouncer, GSAP.

## Εγκατάσταση

```bash
cp .env.example .env      # συμπλήρωσε τις τιμές
npm install
npm run db:migrate        # φτιάχνει τους πίνακες (χρησιμοποιεί το DIRECT_URL)
npm run db:seed           # 5 δωμάτια + ο πρώτος διαχειριστής (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev
```

- Δημόσιο site: `/el`, `/en`, `/de`
- Διαχειριστικό: `/admin`
- Έλεγχοι: `npm test`, `npx eslint src`, `npm run build`

## Βάση

Η εφαρμογή συνδέεται στο PgBouncer (`DATABASE_URL`, με `?pgbouncer=true`).
Τα migrations τρέχουν απευθείας στην Postgres (`DIRECT_URL`).

## Πληρωμές (Viva Smart Checkout)

1. Συμπλήρωσε τα `VIVA_*` στο `.env`.
2. Στην πηγή πληρωμής της Viva όρισε Success URL `{APP_URL}/api/viva/return` και Failure URL `{APP_URL}/api/viva/return?failed=1`.
3. Πρόσθεσε webhook «Transaction Payment Created» στο `{APP_URL}/api/viva/webhook`.

Ροή: ο επισκέπτης διαλέγει δωμάτια, οι ημερομηνίες δεσμεύονται για `BOOKING_HOLD_MINUTES` λεπτά, πληρώνει στη σελίδα της Viva και η κράτηση επιβεβαιώνεται μόνο αφού το API της Viva επιβεβαιώσει τη συναλλαγή.

## Αυτόματο περιεχόμενο

Άρθρα για την Κόρινθο και την περιοχή, γραμμένα σε ελληνικά, αγγλικά και γερμανικά με μία κλήση (`src/lib/ai.ts`).

- Από το διαχειριστικό: Περιεχόμενο > Νέο άρθρο.
- Αυτόματα, με cron (π.χ. Δευτέρα και Πέμπτη 07:00):

```bash
0 7 * * 1,4 curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://example.com/api/cron/generate-content
```

Με `AI_AUTO_PUBLISH=false` τα άρθρα μένουν πρόχειρα μέχρι να τα εγκρίνει κάποιος.

## Τυπογραφία

Όλα τα μεγέθη είναι tokens `--fs-N` (rem + `clamp()`). Όταν χρησιμοποιήσεις νέο μέγεθος, τρέξε `npm run type`.

## Λογότυπο

Τα vector αρχεία βρίσκονται στο `public/brand/` (έγχρωμο, charcoal, ivory, λευκό, `currentColor`· πλήρες, οριζόντιο, σήμα, wordmark, favicon).

## Βιβλιοθήκη μέσων (Bunny CDN)

Φωτογραφίες και βίντεο αποθηκεύονται στο Bunny Storage και σερβίρονται από την Pull Zone (`BUNNY_*` στο `.env`).

- Από το διαχειριστικό: Βιβλιοθήκη μέσων > σύρετε αρχεία. Η «Θέση» ορίζει πού εμφανίζεται το καθένα στο site.
- Μαζική εισαγωγή φακέλου, με βελτιστοποίηση (βίντεο σε σιωπηλά MP4 16 δευτερολέπτων, φωτογραφίες σε WebP):

```bash
node --env-file=.env scripts/import-media.mjs /path/to/folder
```

Χωρίς κλειδιά Bunny τα αρχεία μπαίνουν στο `public/media-local` (εκτός git) για τοπική προεπισκόπηση. Ξανατρέξε την ίδια εντολή μετά τη ρύθμιση του Bunny για να ανέβουν στο CDN.

Οι φωτογραφίες αξιοθέατων στο `public/images/places` είναι από το Wikimedia Commons και εμφανίζονται με δημιουργό και άδεια (`src/lib/site.ts`, `placePhotos`).
