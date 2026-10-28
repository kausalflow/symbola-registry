Where a child stands with the German vaccination schedule (STIKO, as of 2026), the checkups of the yellow
U-Heft (G-BA Kinder-Richtlinie, U10 added August 2026) and the dental checkups Z1 to Z6 (G-BA, as of 2026),
and which dates go into the parent's calendar. The app only reminds of the published schedule; the pediatrician
decides. `now` is an ISO 8601 UTC time; all days and months below are calendar days in one fixed time zone
(here UTC; the phone's own zone in use). `dob` is a date. Output dates are YYYY-MM-DD.

Input: op "status" (with plan "vax", "u" or "z") or "events"; now; child {dob (may be null), name, vax_skip
(vaccine keys the parents do not plan)}; doses [{against: [vaccine keys], date, deleted?}] (recorded
vaccinations), exams [{u, date, deleted?}] (U-Heft checkups, u = "U4"...), visits [{z, date, deleted?}]
(dentist visits); appts: booked appointments {plan: "u"|"z"|"vax"|"other", k (U4, Z2, a vaccine key), ks
(vaccine keys of one vaccination appointment; else [k]), dose (which dose of k), doses ({vaccine key: dose
number}; takes the place of dose), date, time ("HH:MM" or ""), title (other), updatedAt, deleted?}; vax_plan,
u_plan, z_plan: "de" (default) or "none" (the parent turned that schedule off). Deleted records and
appointments are ignored. Every record counts for this one child.

Appointments. For one item, the booked appointment is the newest (updatedAt) that is not deleted and: for U and
Z has plan u/z and k equal to the item; for a vaccine has plan "vax", the vaccine among its ks (or k), and
dose number (doses[k], or dose) equal to the number of the next dose (doses recorded + 1). Its state is
"went" when its day is before today (the day of `now`), else "booked" (a later hour of today is still booked).
"Soon" means went, or booked with its date and time (12:00 if none) before the start of today + 15 days.

status (plan): the answer is {items, open}. items has one entry per item of the plan in the order below:
{k, status, and when they apply: appointment (its date), usual_from, usual_to, window_from, window_to (U and
Z), doses and of (vaccines), usual_from (vaccines, below)}. Status, first match wins:
- vaccine k in the child's vax_skip: "skip".
- vaccine with doses recorded n >= of (number of doses in the plan): "done". U/Z with a recorded exam of that
  key: "done".
- a booked appointment for the item (see above): "booked" or "went".
- no dob: "open".
- U/Z, with windows below and today the start of `now`'s day: "missed" when now >= window_to; "due" when
  now >= window_from; "soon" when now >= window_from - 28 days; else "later".
- vaccine, with m = (now - dob at 00:00 UTC) in months of 30.44 days, n doses recorded, due = months of dose
  n+1: "missed" when the plan has `until` and m > until; "late" when m > (upto if the plan has one, else
  due + 2); "due" when m >= due - 0.5; else "later".
For vaccines the answer also has `doses` = n and `of`, and for later/due/late `usual_from`: the day due months
after dob (whole months: the same day of the month, kept at noon; 1.5 months = 45.66 days). U and Z items have
usual_from/usual_to (the usual period, to excluded) and window_from/window_to (the time the checkup can be
done, to excluded) when dob is known.
`open` lists the keys, in plan order, that the Today screen points out: vaccines due or late (only when the
vaccine plan is on and dob is known); U and Z items due or soon or whose appointment is "soon"; nothing when
that plan is "none".

Ages for U and Z. A period [a, b, unit] runs from the start of the a-th unit of life to the end of the b-th:
d = day (1 = birth day), w = week of 7 days, m = month, y = 12 months. Day and week boundaries are counted in
days from the birth day; month boundaries are the birth date plus k months (the same day of the month, noon
then start of that day; a fractional count such as 4.5 months is 30.44 days per month), start of day.
U (usual period; window): U1 [1,1,d]; [1,1,d] / U2 [3,10,d]; [3,14,d] / U3 [4,5,w]; [3,8,w] / U4 [3,4,m]; [2,4.5,m]
/ U5 [6,7,m]; [5,8,m] / U6 [10,12,m]; [9,14,m] / U7 [21,24,m]; [20,27,m] / U7a [34,36,m]; [33,38,m] /
U8 [46,48,m]; [43,50,m] / U9 [60,64,m]; [58,66,m] / U10 [10,11,y]; same / J1 [13,14,y]; [13,15,y].
Z (usual period = window): Z1 [6,9,m], Z2 [10,20,m], Z3 [21,33,m], Z4 [34,48,m], Z5 [49,60,m], Z6 [61,72,m].
Vaccines: key (doses at months; upto; until): rsv (0; upto 12, until 12), rota (1.5, 2; until 8), 6in1 (2, 4, 11),
pcv (2, 4, 11), menb (2, 4, 12), mmr (11, 15), var (11, 15), tdap (60; upto 84), tdapipv (108; upto 204),
hpv (108, 113; upto 180), menacwy (144; upto 180). The plan order is as listed here: rsv first.
Months in the end-of-month case (born on the 29th to 31st) are left open; see the obligation.

events: the dates that can go into the parent's calendar (all-day events, or timed for a booked appointment),
for the next 365 days. {events: [{uid, date, time, booked}]} in this order: sorted by date and time (ties:
the order of generation below), only events before now + 365 days, one per uid (the first).
- U and Z schedule on (u_plan / z_plan not "none"), per item: with a booked appointment: booked true, uid
  "<childId>-<k>" with child id "c1" (the contract fixes it), date = appointment date, time = its time.
  Otherwise, status due, soon or later: booked false, uid the same, date = the later of today and the start of
  the usual period (U) or of the window (Z), time "". Other statuses: none.
- vaccines (plan on), not skipped, with a booked appointment: the appointment's event (below). Otherwise with
  dob and status due, late or later: booked false, uid "c1-vax-<k>-<next dose number>", date = the later of
  today and the day the usual age of the next dose starts.
- booked vaccination appointments (plan "vax", state booked) whose vaccines are not all received: booked true,
  uid "c1-appt-<appointment id>", date and time of the appointment. A vaccine of the appointment is received
  when its dose number is known (doses[k] or dose) and at least that many doses against it are recorded, or,
  without a dose number, a dose against it was recorded on a day from 14 days before the appointment day on.
- other appointments (plan "other") on or after today: booked true, uid "c1-appt-<appointment id>", date and
  time of the appointment.
Appointments have ids; the contract gives them as "a0", "a1", ... in the order of `appts`, and the child's id
is "c1".
