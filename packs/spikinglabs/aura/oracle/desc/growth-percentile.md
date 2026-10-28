Where a measurement stands among children of the same age and sex, from the WHO growth tables. It only
describes; no wording judges a percentile, and the app never says a child is too small or too big. `op` picks
the function. Times are UTC; `dob` is a calendar date.

Tables: fixtures/growth-percentile/who-lms.json (here: fixtures/who-lms.json) holds, verbatim, the WHO values
the app embeds: {"m"|"f": {"weightKg"|"heightCm"|"headCm": [[L, M, S], ...]}} with one row per whole month of
age, starting at month 0. Weight: 121 rows (0 to 10 years), height: 229 rows (0 to 19 years), head
circumference: 61 rows (0 to 5 years). They are the WHO Child Growth Standards (2006) up to 5 years and the
WHO Growth Reference (2007) after that; height is length lying down before 24 months and standing height from
24 months, as in the tables. Use these numbers as they are.

percentile (sex, dob, measure, value, at): `measure` is weightKg (kg), heightCm or headCm (cm). Age in months
is (at - dob at 00:00 UTC) / (30.4375 days), fractions kept. The row values for that age are interpolated
linearly between the rows of the two surrounding whole months, L, M and S each (exactly at the last row's month
the last row is used). The answer is null (percentile, z and text all null) when sex is not "f" or "m", dob is
missing, value is null, the age is negative, or the age is beyond the last row. Otherwise
z = ((value / M)^L - 1) / (L * S). For weight only: when |z| > 3, with s the sign of z, SD3 = M * (1 + L*S*3s)^(1/L)
and SD2 = M * (1 + L*S*2s)^(1/L) (the weights at 3 and 2 SD on that side), z is replaced by
3s + (value - SD3) / |SD3 - SD2| (WHO's adjustment for weight far from the median). The percentile is
100 * Phi(z) with Phi computed as follows, exactly (the usual error-function approximation of Abramowitz and
Stegun 7.1.26): x = |z| / sqrt(2); t = 1 / (1 + 0.3275911 x);
e = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * exp(-x*x);
Phi = (1 + e) / 2 for z >= 0, else (1 - e) / 2. `text` is "below 1st percentile" when the percentile is under 1,
"above 99th percentile" when it is over 99, else the percentile rounded to the nearest whole number (halves up)
with its English ordinal and the word "percentile", e.g. "50th percentile": suffix "th" for 11, 12, 13 (also
111...) and for numbers ending in 0 or 4 to 9, "st" ending in 1, "nd" in 2, "rd" in 3.

curve (sex, measure, months): the five reference curves at an age in (possibly fractional) months, for the
chart. `values` are, in this order, the measurement at z = -1.8808, -1.0364, 0, 1.0364, 1.8808 (the 3rd, 15th,
50th, 85th and 97th percentile): M * (1 + L*S*z)^(1/L), with L, M, S interpolated as above. null when the sex
or the age has no table row.
