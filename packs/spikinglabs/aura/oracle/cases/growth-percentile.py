"""Cases for the growth-percentile component."""


def pct(note, sex, dob, measure, value, at, raises=None):
    return {"input": {"op": "percentile", "sex": sex, "dob": dob, "measure": measure, "value": value, "at": at}, "note": note}


def curve(note, sex, measure, months):
    return {"input": {"op": "curve", "sex": sex, "measure": measure, "months": months}, "note": note}


def cases():
    out = [
        pct("a girl at 3 months, weight near the median", "f", "2026-01-01", "weightKg", 5.8, "2026-04-02T10:00:00Z"),
        pct("a boy at 6 months, weight", "m", "2026-01-01", "weightKg", 8.0, "2026-07-02T10:00:00Z"),
        pct("a boy at 6 months, height", "m", "2026-01-01", "heightCm", 68.0, "2026-07-02T10:00:00Z"),
        pct("a girl at 6 months, head circumference", "f", "2026-01-01", "headCm", 42.2, "2026-07-02T10:00:00Z"),
        pct("birth: age 0 uses the first row", "f", "2026-10-01", "weightKg", 3.2, "2026-10-01T08:00:00Z"),
        pct("a fraction of a month is interpolated", "m", "2026-01-01", "weightKg", 7.0, "2026-05-16T00:00:00Z"),
        pct("height at 24 months, the table switches from length to height", "f", "2024-10-01", "heightCm", 86.0, "2026-10-01T00:00:00Z"),
        pct("weight far above the median uses WHO's adjustment beyond 3 SD", "m", "2026-01-01", "weightKg", 14.0, "2026-07-02T00:00:00Z"),
        pct("weight far below the median uses the adjustment on the other side", "f", "2026-01-01", "weightKg", 3.0, "2026-07-02T00:00:00Z"),
        pct("height far above is not adjusted", "f", "2026-01-01", "heightCm", 90.0, "2026-07-02T00:00:00Z"),
        pct("very low: text says below 1st", "m", "2026-01-01", "heightCm", 60.0, "2026-07-02T00:00:00Z"),
        pct("very high: text says above 99th", "m", "2026-01-01", "heightCm", 80.0, "2026-07-02T00:00:00Z"),
        pct("a 7 year old boy's weight uses the 2007 reference", "m", "2019-06-15", "weightKg", 23.0, "2026-10-01T00:00:00Z"),
        pct("a 15 year old girl's height", "f", "2011-03-02", "heightCm", 163.0, "2026-10-01T00:00:00Z"),
        pct("weight stops at 10 years: 10 years exactly is the last row", "f", "2016-10-01", "weightKg", 32.0, "2026-10-01T00:00:00Z"),
        pct("weight beyond 10 years has no table", "f", "2015-10-01", "weightKg", 40.0, "2026-10-01T00:00:00Z"),
        pct("head circumference beyond 5 years has no table", "m", "2020-01-01", "headCm", 52.0, "2026-10-01T00:00:00Z"),
        pct("height beyond 19 years has no table", "m", "2006-01-01", "heightCm", 180.0, "2026-10-01T00:00:00Z"),
        pct("before birth", "m", "2026-10-02", "weightKg", 3.0, "2026-10-01T00:00:00Z"),
        pct("no sex", None, "2026-01-01", "weightKg", 6.0, "2026-04-01T00:00:00Z"),
        pct("a sex other than f or m has no table", "x", "2026-01-01", "weightKg", 6.0, "2026-04-01T00:00:00Z"),
        pct("no birth date", "f", None, "weightKg", 6.0, "2026-04-01T00:00:00Z"),
        pct("no value", "f", "2026-01-01", "weightKg", None, "2026-04-01T00:00:00Z"),
    ]
    out += [
        pct(f"ordinal wording for a boy of 6 months at {h} cm", "m", "2026-01-01", "heightCm", h, "2026-07-02T00:00:00Z")
        for note, h in (("3rd", 63.7), ("16th", 65.5), ("26th", 66.2), ("52nd", 67.7), ("77th", 69.2), ("94th", 71.0), ("11th", 64.9), ("12th", 65.1), ("13th", 65.25), ("21st", 65.85), ("22nd", 65.95), ("23rd", 66.05))
    ]
    out += [
        curve("curves for a boy's weight at 4 months", "m", "weightKg", 4),
        curve("curves for a girl's height at 2.5 months", "f", "heightCm", 2.5),
        curve("curves for head circumference at 60 months (last row)", "m", "headCm", 60),
        curve("beyond the last row", "m", "headCm", 60.5),
        curve("negative age", "f", "weightKg", -0.2),
        curve("no sex", None, "weightKg", 4),
    ]
    return out
