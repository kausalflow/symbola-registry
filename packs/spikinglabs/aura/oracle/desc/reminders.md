The fixed rules behind Aura's reminders. They are reminders, not advice: the app never says what a dose
should be, never names an illness and never tells anyone what to do beyond "talk to your doctor"; it shows when
something the parent logged crosses a line, and when a medicine's minimum gap has passed. `op` picks the rule;
`now` (ISO 8601 UTC) is the moment of the check. Times are ISO strings; a day is 24 hours.

alerts (child {dob}, episode {start, end?}, entries): the sick-mode reminders for one illness. `entries` are
that illness's entries: {type, t, and tempC (temp, in °C), kind (diaper: "Wet", "Poop", "Both", "Dry"),
symptoms (symptom: list of names)}. The answer is {alerts: [{kind, symptoms?}]} in this order, each at most
once:
- "fever-3-days": the first and the last temperature of 38.0 °C or more differ by 3 days or more.
- "under-3-months": any temperature of 38.0 °C or more is logged and the child is younger than 3 months (age =
  (now - dob at 00:00 UTC) / 30.44 days; no birth date: never).
- "very-high-temp": a temperature of 40 °C or more less than 24 hours before now.
- "no-wet-diaper": the illness has no `end`, at least one diaper entry exists, and the time since the newest
  wet diaper (kind "Wet" or "Both"; without one, since the illness start) is more than 8 hours.
- "vomiting": 3 or more vomit entries less than 6 hours before now.
- "worrying-symptoms": symptom entries less than 24 hours old name any of "Fast breathing", "Very sleepy /
  floppy", "Not drinking", "Wheezing". `symptoms` lists the distinct ones, lower-cased, newest entry first and
  in the entry's own order.

medicine (meds [{name, gapH, deleted?}], entries [{type "med", name, t}]): for each medicine in the entries
(names compared ignoring case; each once, shown with the name of its newest entry) the answer
{medicines: [{name, gap, gap_hours}]} lists, newest last dose first: `gap` "none" when no medicine that is not
deleted has that name (ignoring case) with a gapH other than 0 or null (gap_hours null); otherwise "passed"
when newest dose + gapH hours is not after now, else "waiting". gap_hours is the medicine's gapH. Aura does not
say what to give; the gap is the parent's own setting (the starting list has Paracetamol (acetaminophen) 4 h
and Ibuprofen 6 h).

backup (state {example, children (number of children that are not deleted), snooze (time the reminder is
snoozed until), backed_up_at, changed_at}): whether Today shows "Back up your log". due is null when the log
is example data, there is no child, or the snooze has not run out. Else "never" when backed_up_at is missing,
"stale" when the log changed after the last backup (changed_at later than backed_up_at) and the last backup is
more than 2 days old; else null.

recall-match (products [{name, deleted?}], recall {title, company}): the product list of the family is matched
against a product recall on the phone. Words of a text: lower-cased, accents removed (NFKD, combining marks
dropped), ß as ss, split at everything that is not a letter or digit, words of one character dropped. A product
matches when it has at least one word and each of its words is among the words of the recall's title and company
together. The answer {matched} is the name of the first matching product that is not deleted, or null.

recall-lists (recalls [{id, title, company, country, date}], products, countries (null = every country, else the
country codes the parent tracks), seen (ids the parent dismissed), feed_seen (ids already seen in the list)):
{new, alerts}. Only recalls whose country is tracked count (any, when countries is null). `new`: ids of tracked
recalls published (date) at most 30 days before now and not in feed_seen; a recall without date is never new.
`alerts`: ids of tracked recalls that match a product (as above) and are not in seen. Both in the order of
`recalls`.
