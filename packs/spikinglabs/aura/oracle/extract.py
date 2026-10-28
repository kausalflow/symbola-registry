"""Cuts the original's code out of Aura's src/app.html into oracle/<component>/original.js.

    python oracle/extract.py /path/to/aura2/src/app.html

Each component lists the top-level declarations (functions and consts) it needs; a declaration runs from its first
line to the line before the next top-level statement. The text is copied verbatim. Also copies common.mjs.
"""
import re
import shutil
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
src_path = Path(sys.argv[1])
lines = src_path.read_text().splitlines()
start = next(i for i, l in enumerate(lines) if l.strip() == "'use strict';")


def find(name):
    pats = [rf"^(async )?function {re.escape(name)}\b", rf"^(const|let|var) {re.escape(name)}\b", rf"^const [^=]*?\b{re.escape(name)} ="]
    for pat in pats:
        for i in range(start, len(lines)):
            if re.search(pat, lines[i]):
                return i
    raise SystemExit(f"declaration not found: {name}")


def grab(name):
    i = find(name)
    j = i + 1
    while j < len(lines) and (lines[j] == "" or lines[j][0] in " \t}])"):
        j += 1
    while lines[j - 1] == "":
        j -= 1
    return "\n".join(lines[i:j])


BASE = ["reEsc", "H", "pad", "toLocalInput", "startOfDay", "lc", "live", "kids", "kid"]
SYNC = ["SYNCED"]
STATE = ["SCHEMA", "MIGRATIONS", "logVersion", "tooNew", "NEWER", "migrate", "emptyState"]
APPT = ["fmtTime", "fmtDate", "atMonths", "apptsOf", "apptKs", "apptDose", "apptFor", "apptT", "apptWhen", "apptState", "apptSoon"]
PLAN = ["VAX_PLAN", "VAX_MORE", "VAX_KINDS", "vaxLabel", "vaxOf", "vaxDoses", "planOn", "ageMonths", "vaxStatus", "vaxOpen",
        "lifeAt", "span", "lastDay", "U_PLAN", "uPlanOn", "uOf", "uExams", "uStatus", "planStatus", "uOpen",
        "Z_PLAN", "zPlanOn", "zExams", "zStatus", "zOpen", "oneLine", "appLink", "eventText", "bookedEvent",
        "vaxGot", "vaxApptKs", "vaxApptOpen", "vaxApptNames", "vaxApptEvent", "uEvent", "vaxEvent", "zEvent", "otherAppts", "upcoming", "otherEvent", "nextEvents"]
COMPONENTS = {
    "merge": BASE + SYNC + STATE + ["isAura", "mergeList", "mergeIn", "KNOWN", "unknownParts", "coveredBy"],
    "save-guard": BASE + SYNC + STATE + ["savedCount", "itemCount", "wellFormed", "persist"],
    "migrate": BASE + SYNC + STATE,
    "growth-percentile": BASE + ["ageMo", "hasCurves", "WHO", "WHO_P", "whoLms", "whoAt", "whoZ", "normCdf", "pctOf", "ordinal", "pctText"],
    "schedule": BASE + APPT + PLAN,
    "reminders": BASE + ["FEVER_C", "SYMPTOMS", "hasTag", "ageMonths", "childOf", "esc", "fmtTime", "fmtDay", "fmtDT", "dur", "ago", "dt", "dnum", "showT", "isWet", "alerts", "medGap",
                         "BACKUP_DAYS", "backupDue", "fold", "words", "recallMatch", "inEnglish", "recallCountryCodes", "tracksCountry", "recallList", "recallNew", "recallAlerts"],
    "backup-retention": BASE + SYNC + STATE + ["uid", "enc", "DRIVE", "KEEP_RECENT", "HOURLY", "prunable", "listBackups", "uploadNew", "snapshot", "LOCAL_SNAPS", "dbKeys", "shareable", "localSnapshot"],
    "media-pack": BASE + SYNC + ["DRIVE", "mediaHome", "MEDIA_REF", "hasRefs", "sha256", "b64bytes", "bytesB64", "mapMedia", "packMedia", "unpackMedia"],
    "ai-redaction": BASE + SYNC + ["lastSent", "nameMap", "redact", "unredact", "deepMap", "ai"],
    "ics": BASE + ["ymd", "hms", "calSpan", "googleCalUrl", "icsAlarm", "icsEsc", "icsFold", "icsText", "icsName", "appLink"],
}
# Single statements inside a function body that cannot be called alone: (first line, line count).
SNIPPETS = {"reminders": ("  const lastByMed = {}", 3)}
for comp, names in COMPONENTS.items():
    seen, parts = set(), []
    for n in names:
        if n in seen:
            continue
        seen.add(n)
        parts.append(grab(n))
    out = here / comp
    out.mkdir(exist_ok=True)
    (out / "original.js").write_text(f"// Verbatim from Aura's src/app.html (declarations: {', '.join(names)}).\n" + "\n".join(parts) + "\n")
    if comp in SNIPPETS:
        first, n = SNIPPETS[comp]
        i = next(i for i in range(start, len(lines)) if lines[i].startswith(first))
        (out / "snippet.js").write_text("// Verbatim from Aura's sickOverview().\n" + "\n".join(lines[i:i + n]) + "\n")
    shutil.copy(here / "common.mjs", out / "common.mjs")
    print(comp, len(parts), "declarations")
