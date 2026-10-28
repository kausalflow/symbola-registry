# aura: the product

A build of Aura is one installable web page (a PWA) for phones. The ten components in this pack are its pure
core (merge, migrate, save guard, percentiles, schedules, reminders, backup retention, media packing, AI
redaction, calendar files); everything below wraps them. Where this file and a component disagree, the
component wins.

## Shape

- A static, client-side web app: one HTML page with its script and styles, a web app manifest, a service worker
  for offline use, an icon and a privacy page. No server of the publisher's own, no build-time backend. The only
  network use: Google (sign-in with Google Identity Services, Drive API v3 with the `drive.file` scope, the
  Google Picker for joining a shared log), the AI service the parent configures, one public recall list, and
  loading the app itself.
- Opens at 375 px width without sideways scrolling; works offline once loaded; installable to the home screen
  (manifest with a shortcut "Emergency card" -> `?open=card`). Deep links: `?open=card`, `?open=appts`.
- The log is one JSON document held in the browser's IndexedDB (database `aura`, store `kv`, key `state`);
  localStorage (`aura.v2`, and the older `sickdaylog.v1`) is only read to move older data over. The app asks the
  browser to keep storage permanently. Saves replace the one record in a single transaction (save-guard rules).
- Look: "Night light": warm dark colours at night (from 19:00 to 7:00 by default, or as set), warm cream by day;
  colour tokens defined once. Calm, few words. Text is English; the doctor summary and the emergency card also
  come in German (a language setting; AI translation of free text is optional).
- Google client ID and Picker key are built in at build time from two environment variables (public by design;
  users can enter their own under More -> Google Drive -> Advanced). Without them Drive features ask for them.
- Secrets: the AI key and tokens stay on the phone and are never synced or backed up into the log's synced part.

## Surfaces

Four tabs at the bottom: Today, Growth, Documents, More. A round "Say it" button floats on Today, the sick view
and Growth.

- **Today**: greeting and child picker (several children), the emergency-card button beside the child; banners
  (example data, backup due, recall matches); lines for due vaccinations, due checkups, due dental checkups and
  appointments in the next two weeks (schedule component); quick buttons and summary cards for what is tracked;
  the day's timeline; running timers (breastfeeding, sleep); a switch to the sick view while an illness is open.
- **Sick view** (sick mode, per child and illness): Overview (last temperature, fluids and wet diapers over 24 h,
  illness day, last doses with "gap passed", reminders from the reminders component, quick buttons for
  temperature, medicine, symptoms, sounds), Chart (fever chart), For the doctor (day-by-day summary, doses,
  vaccinations in the two weeks before, emergency-card facts, photos and sound clips, in English or German; text
  to copy/share; an AI "handover" optionally). Ending an illness ("is better: end sick mode") and reopening it.
- **Add/edit entry sheet**: one sheet per entry type: feed (breast with side and timer, bottle or cup with
  amount), sleep (timer, woke up at, quality), diaper (wet, poop, both, dry; stool look), solids, temperature
  (°C or °F setting; stored in °C), medicine (name from the medicine list, amount, unit), symptoms (free text with
  preset tags such as Fever, Cough), vomit, doctor's notes (free text fields: thinks, advice, medicine, come
  back if), photo, sound (up to 30 s with microphone, or a pasted link to a video), note. Free-text boxes have
  dictation. Entries remember who logged them ("by", set under Share with a partner).
- **Tracking per child**: which trackers are on, with separate lists for everyday and for sick mode (defaults by
  age: feed under 30 months, diapers under 42, solids from 5 months). Changing one list never changes the other.
  Anything tied to a tracker (quick button, summary card, timeline rows, doctor table column) hides when off.
- **Say it**: type or dictate free text; with AI on, it is sorted into entries the parent reviews and adds; without
  AI the text is saved as a note.
- **Growth**: weight, height and head measurements with the WHO percentile curves (3, 15, 50, 85, 97) and the
  child's line (growth-percentile component; needs sex and birth date), a tooth map (types, jaw order, dates),
  milestones, and a link to the dental checkups.
- **Documents tab**: the emergency card; Appointments; Vaccinations; Checkups (U-Heft); Dental checkups; a Kita
  card (contract, measles proof, doctor's note, other; with the measles doses already recorded, facts only); other
  documents. Documents are digital twins of paper documents: one item per page in the paper's order (add via
  camera or photo library, replace in place, move, delete), a note, and a PDF (made on the phone without a
  library; JPEG pages go in as they are).
- **Emergency card**: one record per child: allergies, conditions, regular medicines, blood group, pediatrician,
  insurance, contacts; opens from the card button on every main screen, from the child's sheet and the home-screen
  shortcut; allergies, conditions and medicines also go into the doctor summary and AI handover; contacts and
  insurance never go into a prompt.
- **Vaccinations**: the schedule rows with status (schedule component), doses as written in the book (date,
  vaccines it was against, batch/doctor notes), "not planned", appointments, add to calendar; its pages are a
  document. **Checkups**: U1 to U10/J1 rows and visits (date, who, note); pages are a document. **Dental checkups**:
  Z1 to Z6 and other visits (fluoride, teeth seen added to the tooth map); pages are the dental pass document.
  Reading a document's pages with AI (when switched on, asked once) produces only a review list; nothing is saved
  until the parent checks it. The U-Heft reader routes Z entries to dental.
- **Appointments** (one per checkup or dental checkup; one vaccination appointment can cover several vaccines;
  any other appointment has a title and an optional linked document): date, optional time, place, note; once
  the day has passed the app asks to record the visit; saving a coming appointment offers the calendar (Google
  link, .ics file, or sharing the file) from the ics component.
- **More**: Children (add, edit, delete, sex, birth date, tracker lists); Illnesses; Look (theme auto/day/night,
  unit °C/°F); Medicines (name and minimum gap in hours; starting list Paracetamol (acetaminophen) 4 h and
  Ibuprofen 6 h); Google Drive backup and sync (connect, sync now, restore from a Drive backup, join a shared log,
  advanced client ID); Share with a partner (their Google email; who has access; remove); AI helper (service,
  address, model, key; "Read new and replaced pages with AI"); Your data (storage used, save a backup file via the
  share sheet, restore from a backup file or a daily copy, export/import, wipe); product list and recall feed
  (countries tracked, "Seen"); document language.
- **Files**: `Aura/aura-log.json` in the parent's Drive; `Aura/backups/aura-backup-<hour>.json`,
  `aura-log-before-vN.json`, `backups/media/<sha256>.<ext>`; `Aura/documents/<name>.pdf` (one PDF per document with
  pages, remade only when changed, a deleted document's PDF moved to the Drive trash); backup files saved by the
  parent; `.ics` files.

## Flows

1. **First use**: open the page; example data shows with a banner "Start with my child"; add the child (name,
   birth date, sex); the app then asks for a backup (Google Drive or a file). Uses save-guard on every save.
2. **Log a day**: tap a quick button, fill the sheet or start a timer; the entry appears in the timeline and
   summary; the log saves (save-guard) and syncs about 2 seconds later if connected.
3. **Sick mode**: turn it on for a child; temperature, medicine and symptoms come first; each temperature or
   medicine entry updates the reminders and "gap passed" pills (reminders component); "For the doctor" builds the
   summary (and optionally an AI handover through ai-redaction); end sick mode when better.
4. **Connect Drive**: More -> Google Drive -> Connect: sign in, find or create `Aura/aura-log.json`; first sync
   writes the phone's log. Each later sync: read, merge (merge), write, check the version, repeat up to three times;
   before writing, a backup copy is saved (backup-retention, media-pack for photos/sounds); the PDFs of documents
   are kept in `documents`. Older logs on Drive are upgraded (migrate) after a before-vN copy.
5. **Share with a partner**: owner shares the one file by Google email; partner uses Join a shared log (Picker);
   both phones merge item by item; entries show who logged them; the partner's backups go to their own Drive.
6. **Restore**: from a Drive backup (media references fetched back with media-pack), a daily copy on the phone, or
   a backup file: the chosen copy is merged in (merge), never replacing, and never deleting.
7. **Vaccinations, checkups, dental**: open the screen from Documents; rows show status and "usually" times from
   the schedule component; tap a row to record the visit/dose, add an appointment, or add to calendar (ics); Today
   points out what is due. Birth date is needed for statuses.
8. **Documents**: add pages by photo; reorder, replace, delete; save as PDF; with page reading on, new or replaced
   pages of the vaccination book/U-Heft/dental pass go (images) to the parent's own AI service (ai-redaction rules),
   and the answer is a review list.
9. **Growth**: add a measurement; the curves and percentile text come from growth-percentile; tooth map and
   milestones are free of schedules.
10. **Recalls**: on opening, at most every 12 h, fetch the public recall list; match against the family's product
    list on the phone (reminders component); a banner with "Details" and "Seen" for matches; "new product recalls"
    line for the last 30 days.
11. **Upgrade**: opening an older log or a newer app version: migrate runs once and keeps before-vN; an older app
    that meets a newer log stops and asks to be updated, changing nothing.

## Interfaces

- Google Identity Services token flow (`drive.file`), Drive API v3 (files list/get/create/update/delete, multipart
  and resumable upload), Google Picker (needs the API key).
- AI: Anthropic Messages API (default model claude-opus-5-5 in the original) or any OpenAI-style chat API (address,
  model, key set by the parent; https or http://localhost only), or the on-device sampling API of the host when the
  page runs inside one; images only to the parent's own service.
- Recall Tracker: `GET` a public JSON list (array of {id, title, company, country_sold_in, publish_datetime,
  scraped_datetime, url, reason (text or {en: ...}), source}); at most every 12 h.
- Browser: IndexedDB, Web Share API for files, MediaRecorder for sounds, SpeechRecognition (optional), camera/file
  inputs, service worker.

## Order

1. The ten components and the log: storage, save guard, migration, merge.
2. Today, entry sheets, timers, the example data, tracking lists.
3. Drive sync with backups and media; backup file save/restore.
4. Sick mode and the doctor summary; reminders.
5. Growth with percentiles; schedules, appointments and calendar files; documents and PDFs; emergency card.
6. AI features, partner sharing, recalls, Kita, German doctor summary.
