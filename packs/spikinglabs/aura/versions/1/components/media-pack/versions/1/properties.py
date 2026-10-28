"""Behavioural properties for spikinglabs/media-pack."""

import base64
import hashlib

from hypothesis import assume, given, strategies as st

from schema import Input

COLL = ["children", "episodes", "entries", "meds", "measurements", "growth", "products", "vaccines", "checkups", "dental", "appts", "emergency", "docs", "pages"]
TYPES = st.sampled_from(["image/jpeg", "image/png", "audio/webm;codecs=opus", "audio/mp4", "image/svg+xml"])


@st.composite
def media(draw):
    raw = draw(st.binary(min_size=1, max_size=40))
    return f"data:{draw(TYPES)};base64," + base64.b64encode(raw).decode()


@st.composite
def logs(draw):
    pool = draw(st.lists(media(), min_size=1, max_size=4))
    log = {"app": "aura", "v": 3, "settings": {"theme": "auto"}}
    for k in draw(st.lists(st.sampled_from(COLL), unique=True, min_size=1, max_size=4)):
        log[k] = [
            {"id": f"{k}{i}", "note": "n", **({"img": draw(st.sampled_from(pool))} if draw(st.booleans()) else {}), **({"audio": draw(st.sampled_from(pool))} if draw(st.booleans()) else {})}
            for i in range(draw(st.integers(0, 4)))
        ]
    return log


def name_of(url):
    head, _, _ = url.partition(",")
    ext = head[5:].split(";")[0].split("/")[1]
    return hashlib.sha256(url.encode()).hexdigest() + "." + "".join(c for c in ext if c.isalnum() or c in "_.+-")


def test_each_distinct_picture_is_one_file_named_by_its_hash(impl):
    @given(logs())
    def check(log):
        out = impl(Input(op="pack", data=log))
        urls = []
        for k in COLL:
            for x in log.get(k, []):
                urls += [v for f, v in x.items() if f in ("img", "audio")]
        want = list(dict.fromkeys(urls))
        assert [u.name for u in out.uploads] == [name_of(u) for u in want]
        for u, url in zip(out.uploads, want):
            assert u.type == url[5:].split(";")[0] and u.bytes_b64 == url.partition(",")[2]
        for k in COLL:
            for x, y in zip(log.get(k, []), out.data.get(k, [])):
                for f in ("img", "audio"):
                    if f in x:
                        assert y[f] == f"aura-media:{name_of(x[f])}#{x[f].partition(',')[0]}"
                    assert y["id"] == x["id"] and y["note"] == x["note"]
        assert out.data["settings"] == log["settings"]

    check()


def test_a_name_already_in_the_folder_is_not_uploaded_again(impl):
    @given(logs())
    def check(log):
        first = impl(Input(op="pack", data=log))
        again = impl(Input(op="pack", data=log, existing=[u.name for u in first.uploads]))
        assert again.uploads == [] and again.data == first.data

    check()


def test_what_is_packed_unpacks_to_the_same_log(impl):
    @given(logs())
    def check(log):
        packed = impl(Input(op="pack", data=log))
        files = {u.name: u.bytes_b64 for u in packed.uploads}
        back = impl(Input(op="unpack", data=packed.data, media=files))
        assert back.data == log and back.missing == 0

    check()


def test_a_missing_file_costs_the_item_and_nothing_else(impl):
    @given(logs(), st.data())
    def check(log, data):
        packed = impl(Input(op="pack", data=log))
        files = {u.name: u.bytes_b64 for u in packed.uploads}
        assume(files)
        lost = set(data.draw(st.lists(st.sampled_from(sorted(files)), unique=True, max_size=len(files))))
        back = impl(Input(op="unpack", data=packed.data, media={n: b for n, b in files.items() if n not in lost}))
        want_missing = 0
        for k in COLL:
            kept = []
            for x in log.get(k, []):
                if any(name_of(x[f]) in lost for f in ("img", "audio") if f in x):
                    want_missing += 1
                else:
                    kept.append(x)
            assert back.data.get(k, []) == kept
        assert back.missing == want_missing

    check()
