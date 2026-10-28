"""Cases for the schedule component."""

NOW = "2026-10-27T10:00:00Z"


def st(note, plan, dob, **kw):
    child = {"dob": dob, **({"vax_skip": kw.pop("skip")} if "skip" in kw else {})}
    return {"input": {"op": "status", "plan": plan, "now": kw.pop("now", NOW), "child": child, **kw}, "note": note}


def ev(note, dob, **kw):
    child = {"dob": dob, **({"vax_skip": kw.pop("skip")} if "skip" in kw else {})}
    return {"input": {"op": "events", "now": kw.pop("now", NOW), "child": child, **kw}, "note": note}


def d(*against, date="2026-09-01", **kw):
    return {"against": list(against), "date": date, **kw}


def ap(plan, k, date, time="", **kw):
    return {"plan": plan, "k": k, "date": date, "time": time, **kw}


def cases():
    out = []
    # vaccinations
    out.append(st("a newborn: only the RSV antibody is due, the rest comes later", "vax", "2026-10-20"))
    out.append(st("a baby of 3.25 months with the first 6-in-1, pneumococcus and meningococcus B recorded: the second dose is not due before 3.5 months", "vax", "2026-07-20", doses=[d("6in1", "pcv", "menb", date="2026-09-21")]))
    out.append(st("a baby of 3.7 months: the second 6-in-1 is due", "vax", "2026-07-05", doses=[d("6in1", date="2026-09-06")]))
    out.append(st("the day half a month before the usual age counts as due (46 days = 1.51 months, 45 days = 1.48)", "vax", "2026-09-11"))
    out.append(st("one day earlier it is still later", "vax", "2026-09-12"))
    out.append(st("a first dose not recorded long after the usual age is late; rotavirus is over after 8 months", "vax", "2026-02-01"))
    out.append(st("a vaccine recorded together with others counts for each; the second pneumococcus dose is late after due + 2 months", "vax", "2026-02-27", doses=[d("6in1", "pcv", date="2026-04-30"), d("6in1", date="2026-06-30")]))
    out.append(st("vaccines with an upto age: Tdap booster at 5 years", "vax", "2021-08-01"))
    out.append(st("a child of 6 with the Tdap booster late (upto 84 months)", "vax", "2019-04-01"))
    out.append(st("a child of 11: HPV first dose is due; the second is a later dose", "vax", "2015-09-01", doses=[d("hpv", date="2026-01-10")]))
    out.append(st("done when all doses are recorded; deleted doses and doses of a skipped vaccine", "vax", "2024-10-01", skip=["menb"], doses=[d("mmr", "var", date="2025-10-01"), d("mmr", "var", date="2026-01-05"), d("6in1", date="2025-01-01", deleted=True)]))
    out.append(st("no birth date: nothing is due, the usual ages are shown", "vax", None, doses=[d("rsv")]))
    out.append(st("a booked appointment replaces the usual time for the dose it is for", "vax", "2026-07-05", doses=[d("6in1", date="2026-09-06")], appts=[ap("vax", "6in1", "2026-11-05", "09:30", dose=2), ap("vax", "pcv", "2026-11-05", "09:30", dose=1)]))
    out.append(st("an appointment for a vaccination with several vaccines and a dose number each", "vax", "2026-07-05", appts=[{"plan": "vax", "ks": ["6in1", "pcv"], "doses": {"6in1": 1, "pcv": 1}, "date": "2026-10-28", "time": ""}]))
    out.append(st("an appointment whose day has passed is 'went'; one for another dose is ignored", "vax", "2026-07-05", appts=[ap("vax", "6in1", "2026-10-26", dose=1), ap("vax", "pcv", "2026-11-01", dose=2)]))
    out.append(st("an appointment earlier today is still booked (its day has not passed)", "vax", "2026-09-01", appts=[ap("vax", "rota", "2026-10-27", "08:00", dose=1)]))
    out.append(st("of two appointments for one dose the newest wins; a deleted one is ignored", "vax", "2026-09-01", appts=[ap("vax", "rsv", "2026-11-01", dose=1, updatedAt=1), ap("vax", "rsv", "2026-12-01", dose=1, updatedAt=2), ap("vax", "rota", "2026-12-01", dose=1, deleted=True)]))
    out.append(st("the vaccine schedule turned off", "vax", "2026-07-05", vax_plan="none"))
    # checkups
    out.append(st("U-Heft for a baby of 11 weeks with nothing recorded", "u", "2026-08-10"))
    out.append(st("U-Heft with U2 and U3 recorded and U4 coming", "u", "2026-08-10", exams=[{"u": "U1", "date": "2026-08-10"}, {"u": "U2", "date": "2026-08-14"}, {"u": "U3", "date": "2026-09-15"}]))
    out.append(st("a window 28 days ahead is 'soon' (U5 opens 24 November)", "u", "2026-07-24"))
    out.append(st("a window 29 days ahead is still 'later' (U5 opens 25 November)", "u", "2026-07-25"))
    out.append(st("the last day of a window is still due, the day after is missed", "u", "2026-08-01", now="2026-12-15T23:00:00Z"))
    out.append(st("the day after the window closes", "u", "2026-08-01", now="2026-12-16T00:00:00Z"))
    out.append(st("older child: later checkups and the new U10", "u", "2016-11-15"))
    out.append(st("a booked appointment shows instead of the usual time, even outside the window", "u", "2026-08-10", appts=[ap("u", "U4", "2027-01-20"), ap("z", "U4", "2026-11-01"), ap("u", "U3", "2026-10-26", "10:00")]))
    out.append(st("an appointment never replaces a recorded checkup", "u", "2026-08-10", exams=[{"u": "U3", "date": "2026-09-15"}], appts=[ap("u", "U3", "2026-11-20")]))
    out.append(st("no birth date", "u", None))
    out.append(st("checkups turned off", "u", "2026-08-10", u_plan="none"))
    out.append(st("U1 and U2 counted in days from the birth day", "u", "2026-10-25"))
    # dental
    out.append(st("dental checkups for a child of 8 months", "z", "2026-02-20"))
    out.append(st("dental checkups for a child of 3 years with Z1 and Z2 recorded", "z", "2023-09-01", visits=[{"z": "Z1", "date": "2024-03-10"}, {"z": "Z2", "date": "2024-09-10"}]))
    out.append(st("a booked dental appointment, one deleted", "z", "2026-02-20", appts=[ap("z", "Z1", "2026-11-12", "14:15"), ap("z", "Z1", "2026-12-01", updatedAt=5, deleted=True)]))
    out.append(st("dental plan off", "z", "2026-02-20", z_plan="none"))
    # events
    out.append(ev("calendar dates for a baby of 11 weeks", "2026-08-10"))
    out.append(ev("booked appointments go in with their time; skipped vaccines, recorded vaccines and recorded checkups do not", "2026-08-10", skip=["rota"], exams=[{"u": "U3", "date": "2026-09-15"}],
                  doses=[d("rsv")], appts=[ap("u", "U4", "2026-12-02", "08:45"), ap("vax", "6in1", "2026-11-04", "10:00", dose=1), ap("other", "x", "2026-10-30", "15:00", title="Hip ultrasound"), ap("other", "x", "2026-10-20", title="Past visit")]))
    out.append(ev("schedules turned off give no schedule dates", "2026-08-10", vax_plan="none", u_plan="none", z_plan="none", appts=[ap("other", "x", "2026-11-30", title="Therapy")]))
    out.append(ev("a child of 6 years: only far-off dates are left out", "2020-09-01", exams=[{"u": "U9", "date": "2025-10-01"}]))
    # months from a birth date on the 29th to 31st end on the last day of a shorter month
    out.append(st("born on the 31st: months end on the last day of a shorter month (31 Aug + 3 months = 30 Nov)", "u", "2026-08-31"))
    out.append(st("born on 29 February in a leap year: a year later is 28 February", "vax", "2024-02-29", now="2025-03-10T10:00:00Z"))
    out.append(ev("born on the 31st: calendar dates fall on the last day of shorter months", "2026-05-31"))
    return out
