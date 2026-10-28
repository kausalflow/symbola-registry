The calendar file and the Google Calendar link for dates Aura already knows (checkups, vaccinations,
appointments). Aura never signs in to a calendar: the parent gets a prefilled Google Calendar link for one
event, or an .ics file (RFC 5545) for one or several events, to open in any calendar app. Input: now (ISO 8601
UTC), href (the address the app is open at, e.g. "https://example.org/aura/?x=1#y"), events [{uid, at, time,
title, details, location, booked}]: `at` is the start as a local clock time without zone ("2026-11-04T09:30",
only its date counts for an all-day event; times are in one fixed zone, UTC here, the phone's own in use);
`time` is "" for an all-day event or "HH:MM" for one at a time of day; location may be missing or ""; booked is
true for a booked appointment. The answer is {ics, filename, google_url}.

Dates written below: YYYYMMDD for a day, YYYYMMDDTHHMMSS for a local time (seconds 00, no zone letter).
An all-day event runs from its day to the next day (DTEND is the day after, as the standard wants).
A timed event lasts one hour from its start (DTEND may be on the next day).

ics: lines end with CRLF, the file's last line too. Lines are, in this order:
BEGIN:VCALENDAR, VERSION:2.0, PRODID:-//Aura//Baby log//EN, CALSCALE:GREGORIAN, METHOD:PUBLISH, then per event:
BEGIN:VEVENT, UID:<uid>@aura, DTSTAMP:<now as YYYYMMDDTHHMMSSZ>, DTSTART and DTEND (all-day:
DTSTART;VALUE=DATE:<day> and DTEND;VALUE=DATE:<next day>; timed: DTSTART:<start> and DTEND:<end>),
SUMMARY:<title>, DESCRIPTION:<details>, LOCATION:<location> (only if not empty), URL:<app address> (only if
booked; the address href without query and fragment, followed by ?open=appts), TRANSP:OPAQUE for a booked
timed event and TRANSP:TRANSPARENT for every other, then the reminders and END:VEVENT; finally END:VCALENDAR.
Reminders (BEGIN:VALARM, ACTION:DISPLAY, DESCRIPTION:<title>, TRIGGER:<t>, END:VALARM): a timed event gets two,
TRIGGER:-P1D then TRIGGER:-PT1H (the day before and an hour before); an all-day event gets one,
TRIGGER:PT9H (9:00 on the day).
Text values (title, details, location) are escaped: every "\\", ";" and "," gets a backslash in front, and each
line break (LF or CRLF) becomes the two characters \n (RFC 5545).
Folding (RFC 5545): a line longer than 75 octets of UTF-8 is split, joined by CRLF and one space, so that every
physical line including that leading space is at most 75 octets. Pieces are filled greedily (the first takes as
many whole characters as fit in 75 octets, each later one as many as fit in 74), and a character is never split.

filename: with exactly one event "aura-<s>.ics", where s is the title up to the first " ·" (space, middle dot),
lower-cased, with every run of characters other than a-z and 0-9 replaced by one "-"; otherwise "aura-dates.ics".

google_url: null unless there is exactly one event. Else
"https://calendar.google.com/calendar/render?" followed by the query parameters in this order: action=TEMPLATE,
text=<title>, dates=<DTSTART value>/<DTEND value> (as in the file), details=<details>, and location=<location>
when not empty, encoded as application/x-www-form-urlencoded (spaces as "+", letters, digits and "*-._" kept,
all other characters as percent-encoded UTF-8 bytes in capitals).
