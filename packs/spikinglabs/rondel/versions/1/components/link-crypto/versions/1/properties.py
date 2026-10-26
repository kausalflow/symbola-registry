"""Behavioural properties for spikinglabs/link-crypto."""

import base64
import hashlib
import hmac
import re

from hypothesis import given, strategies as st

from schema import Input

B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
KEYS = st.text(alphabet=B64URL, min_size=22, max_size=44).filter(lambda s: len(s) % 4 != 1)
ROOMS = st.text(alphabet=B64URL, min_size=8, max_size=64)


def call(impl, **kw):
    return impl(Input(**kw)).result


def unb64url(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def hkdf(key, salt, info, n=32):
    prk = hmac.new(salt, key, hashlib.sha256).digest()
    out, block = b"", b""
    for i in range(1, -(-n // 32) + 1):
        block = hmac.new(prk, block + info + bytes([i]), hashlib.sha256).digest()
        out += block
    return out[:n]


def test_auth_is_hkdf_of_the_link_key(impl):
    @given(KEYS, ROOMS)
    def check(key, room):
        want = base64.b64encode(hkdf(unb64url(key), f"rondel:{room}".encode(), b"auth-v1")).decode()
        assert call(impl, op="auth", link_key=key, room_id=room) == want

    check()


def test_sealed_text_has_a_nonce_ciphertext_and_tag_and_opens_again(impl):
    @given(KEYS, ROOMS, st.one_of(st.binary(max_size=300), st.integers(32760, 70000).map(lambda n: bytes(i % 251 for i in range(n)))), st.binary(min_size=12, max_size=12))
    def check(key, room, data, iv):
        plain = base64.b64encode(data).decode()
        sealed = call(impl, op="seal", link_key=key, room_id=room, plaintext=plain, iv=base64.b64encode(iv).decode())
        raw = base64.b64decode(sealed, validate=True)
        assert raw[:12] == iv and len(raw) == 12 + len(data) + 16
        got = call(impl, op="open", link_key=key, room_id=room, sealed=sealed)
        assert got == {"length": len(data), "sha256": hashlib.sha256(data).hexdigest()}

    check()


def test_each_seal_uses_a_fresh_nonce(impl):
    @given(KEYS, ROOMS, st.binary(max_size=50))
    def check(key, room, data):
        plain = base64.b64encode(data).decode()
        a = call(impl, op="seal", link_key=key, room_id=room, plaintext=plain)
        b = call(impl, op="seal", link_key=key, room_id=room, plaintext=plain)
        assert a != b and base64.b64decode(a)[:12] != base64.b64decode(b)[:12]
        assert call(impl, op="open", link_key=key, room_id=room, sealed=a) == call(impl, op="open", link_key=key, room_id=room, sealed=b)

    check()


def test_only_the_right_key_and_room_open_it_and_damage_is_detected(impl):
    @given(KEYS, ROOMS, st.binary(min_size=1, max_size=60), st.integers(0, 10_000), st.integers(1, 255))
    def check(key, room, data, where, flip):
        sealed = call(impl, op="seal", link_key=key, room_id=room, plaintext=base64.b64encode(data).decode())
        raw = bytearray(base64.b64decode(sealed))
        raw[where % len(raw)] ^= flip
        for kw in ({"sealed": base64.b64encode(bytes(raw)).decode()}, {"sealed": sealed, "room_id": room + "x"}):
            args = {"op": "open", "link_key": key, "room_id": room, "sealed": sealed} | kw
            try:
                call(impl, **args)
            except ValueError:
                pass
            else:
                raise AssertionError("opened something it must not open")

    check()


def test_links_lead_back_to_the_same_route(impl):
    @given(ROOMS, st.text(alphabet=B64URL, min_size=1, max_size=40), st.sampled_from(["meeting", "series"]), st.booleans())
    def check(room, key, kind, shared):
        extra = {"share_url": "https://host.example/page#ignored"} if shared else {}
        link = call(impl, op="link", kind=kind, id=room, key=key, origin="https://rondel.example.com", pathname="/", **extra)
        assert re.search(r"#(/[ms]/|[ms]\.)", link)
        assert (link.startswith("https://host.example/page#") if shared else link.startswith("https://rondel.example.com/#/"))
        got = call(impl, op="route", hash=link[link.index("#"):])
        assert got == {"route": kind, "id": room, "key": key}

    check()


def test_new_ids_have_the_sizes_of_12_and_18_random_bytes(impl):
    def check():
        seen = set()
        for _ in range(8):
            ids = call(impl, op="new_ids")
            assert re.fullmatch(r"[A-Za-z0-9_-]{16}", ids["room_id"]) and re.fullmatch(r"[A-Za-z0-9_-]{24}", ids["key"])
            seen.add((ids["room_id"], ids["key"]))
        assert len(seen) == 8

    check()
