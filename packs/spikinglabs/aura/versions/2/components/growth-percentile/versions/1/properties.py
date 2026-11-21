"""Behavioural properties for spikinglabs/growth-percentile."""

import json
import math
from pathlib import Path

from hypothesis import assume, given, strategies as st

from schema import Input

WHO = json.loads((Path(__file__).parent / "fixtures" / "who-lms.json").read_text())
MEASURES = ["weightKg", "heightCm", "headCm"]
SEX = st.sampled_from(["f", "m"])
Z5 = [-1.8808, -1.0364, 0, 1.0364, 1.8808]


def lms(sex, measure, months):
    rows = WHO[sex][measure]
    if months < 0 or months > len(rows) - 1:
        return None
    i = min(int(months), len(rows) - 2)
    f = months - i
    return [a + (b - a) * f for a, b in zip(rows[i], rows[i + 1])]


def at_z(l, z):
    L, M, S = l
    return M * (1 + L * S * z) ** (1 / L)


def curve(impl, sex, measure, months):
    return impl(Input(op="curve", sex=sex, measure=measure, months=months)).values


def pct(impl, sex, measure, value, months):
    # a birth date 4 years ago, measured `months` after birth: the same age whatever the day lengths
    return impl(Input(op="percentile", sex=sex, dob="2000-01-01", measure=measure, value=value, at=_at(months)))


def _at(months):
    import datetime as dt

    return (dt.datetime(2000, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(days=months * 30.4375)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"


def test_the_curves_are_the_tables_interpolated(impl):
    @given(SEX, st.sampled_from(MEASURES), st.floats(0, 230))
    def check(sex, measure, months):
        got = curve(impl, sex, measure, months)
        want = lms(sex, measure, months)
        if want is None:
            assert got is None
        else:
            assert len(got) == 5
            for g, z in zip(got, Z5):
                assert math.isclose(g, at_z(want, z), rel_tol=1e-6)
            assert got == sorted(got)

    check()


def test_a_measurement_on_a_curve_is_at_that_percentile(impl):
    @given(SEX, st.sampled_from(MEASURES), st.integers(1, 60))
    def check(sex, measure, months):
        want = lms(sex, measure, months)
        for z, p in zip(Z5, (3, 15, 50, 85, 97)):
            got = pct(impl, sex, measure, at_z(want, z), months).percentile
            assert abs(got - p) < 0.1, (z, got)

    check()


def test_a_higher_value_is_never_a_lower_percentile(impl):
    @given(SEX, st.sampled_from(MEASURES), st.integers(1, 60), st.floats(0.7, 1.4), st.floats(0.0, 0.2))
    def check(sex, measure, months, k, d):
        m = lms(sex, measure, months)[1]
        a = pct(impl, sex, measure, m * k, months).percentile
        b = pct(impl, sex, measure, m * (k + d), months).percentile
        assert 0 <= a <= b <= 100

    check()


def ordinal(n):
    return f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def test_the_wording_only_describes(impl):
    @given(SEX, st.integers(1, 60), st.floats(0.8, 1.2))
    def check(sex, months, k):
        r = pct(impl, sex, "heightCm", lms(sex, "heightCm", months)[1] * k, months)
        p = r.percentile
        assume(p is not None)
        if p < 1:
            assert r.text == "below 1st percentile"
        elif p > 99:
            assert r.text == "above 99th percentile"
        else:
            assert r.text == f"{ordinal(math.floor(p + 0.5))} percentile"

    check()


def test_no_table_no_answer(impl):
    @given(st.sampled_from(MEASURES), st.integers(0, 300), st.sampled_from([None, "x", "F", ""]))
    def check(measure, months, sex):
        r = pct(impl, sex, measure, 10.0, months)
        assert r.percentile is None and r.z is None and r.text is None

    check()


def test_weight_beyond_three_sd_is_adjusted_and_other_measures_are_not(impl):
    @given(SEX, st.integers(1, 60), st.floats(1.6, 3.0))
    def check(sex, months, k):
        for measure in ("weightKg", "heightCm"):
            l = lms(sex, measure, months)
            z = pct(impl, sex, measure, l[1] * k, months).z
            raw = ((l[1] * k / l[1]) ** l[0] - 1) / (l[0] * l[2])
            if measure == "heightCm" or abs(raw) <= 3:
                assert math.isclose(z, raw, rel_tol=1e-5)
            else:
                s = 1 if raw > 0 else -1
                sd3, sd2 = at_z(l, 3 * s), at_z(l, 2 * s)
                assert math.isclose(z, 3 * s + (l[1] * k - sd3) / abs(sd3 - sd2), rel_tol=1e-5)

    check()
