# Aura

Aura is a calm, phone-first log for a baby and, later, a child. Parents log feeds (with a breastfeeding timer),
sleep (with a timer), diapers, solids, temperature, medicine, growth, teeth and notes, mostly in a few taps or
by talking ("Say it"). When the child is sick, sick mode moves temperature, medicine and symptoms to the top and
gives a fever chart and a day-by-day summary for the doctor. Paper documents (vaccination book, yellow U-Heft,
dental pass, Kita papers) are kept as digital twins page by page, with the German schedules for vaccinations,
checkups and dental checkups as reminders.

It has no server of its own. The family's log is one JSON document on the phone and, if the parent connects it,
one file in their own Google Drive that a partner can share. Everything runs in the browser as an installable
page that works offline. The product is made for German-speaking families, the text is English, and the doctor
summary can also be shown in German.

A rebuild is faithful when the family's data is as safe and as private as in the original and the rules below
behave exactly: logs from the original (and every earlier version) open and merge; a partner's phone and a
rebuild can share one Drive file; the schedules, reminders and percentiles say what the original says. The
components in this pack pin exactly those rules; `PRODUCT.md` says what the rest of the app is.

## Non-goals

- Medical advice of any kind: no doses, no diagnoses, no treatment suggestions, no judging of a percentile.
  Aura reminds and records; the pediatrician decides.
- A server, accounts or any service run by the publisher. No analytics. No connection to kidsfox (the family's
  Kita app has no API) and no sign-in to any calendar.
- Other countries' schedules, other languages beyond English and the German doctor summary, and a store-style
  native app. The look (colours, layout, icons, exact wording of texts) is the builder's, within PRODUCT.md.
- Real-time collaboration beyond item-by-item merge; there is no locking or turn-taking.
- Encrypting the Drive file with a passphrase, "Ask" chat and a weekly digest (planned, not built).

## Priorities

When goals conflict, earlier ones win:

1. Never lose or corrupt the family's data: the merge, migration, save guard, backups and media rules, exactly.
2. Privacy: names, photos, sounds, links and birth dates stay on the phone and in the parent's own Drive; AI and
   recall features send only what the AI-redaction and recall rules allow.
3. No advice: nothing the app says tells anyone what to give or what illness it is.
4. Schedules and reminders: the vaccination, checkup and dental status, the reminders and percentiles, exactly.
5. Calendar files and links as specified.
6. The rest of the app as `PRODUCT.md` describes (screens, flows, sick mode, documents); styling is the builder's.

## Who resolves gaps

spikinglabs, as the namespace holder. If the pack doesn't settle something, record the
question and the reading you chose in `NOTES.md` next to your build; obligations marked
`open` in `obligations.toml` are yours to choose.
