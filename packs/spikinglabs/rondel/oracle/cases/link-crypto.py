"""Cases for the link-crypto component."""
import base64

KEY = "q1w2e3r4t5y6u7i8o9p0aSdFgHjKlZxCvBnM-_12345"


def b(data: bytes) -> str:
    return base64.b64encode(data).decode()


def case(note, raises=None, **kw):
    return {"input": kw, "note": note, **({"raises": raises} if raises else {})}


def cases():
    out = []
    out.append(case("server proof of a saved link", op="auth", link_key=KEY, room_id="compatroom1"))
    out.append(case("the room is part of the salt", op="auth", link_key=KEY, room_id="compatroom2"))
    out.append(case("the last character of a 43-character key carries only 2 bits: spellings of the same bytes agree", op="auth", link_key=KEY[:-1] + "6", room_id="compatroom1"))
    out.append(case("a generated 24-character key", op="auth", link_key="AbCdEfGhIjKlMnOpQrStUvWx", room_id="AbCdEfGhIjKlMnOp"))
    out.append(case("base64url characters - and _ decode as 62 and 63", op="auth", link_key="----____----____", room_id="r"))
    for v in ("0.26.0", "0.27.0"):
        out.append({"input": {"$fixture": f"open-{v}.json"}, "note": f"the update Rondel {v} stored for a meeting still decrypts"})
    good = {"$fixture": "open-0.27.0.json"}
    import json, pathlib
    fx = json.loads((pathlib.Path(__file__).resolve().parents[2] / "versions/1/components/link-crypto/versions/1/fixtures/open-0.27.0.json").read_text())
    out.append(case("another room cannot open it", raises="ValueError", **{**fx, "room_id": "compatroom2"}))
    out.append(case("another key cannot open it", raises="ValueError", **{**fx, "link_key": "r1w2e3r4t5y6u7i8o9p0aSdFgHjKlZxCvBnM-_12345"}))
    s = fx["sealed"]
    out.append(case("a damaged byte is detected", raises="ValueError", **{**fx, "sealed": s[:40] + ("A" if s[40] != "A" else "B") + s[41:]}))
    out.append(case("shorter than a nonce and a tag", raises="ValueError", **{**fx, "sealed": b(b"short")}))
    iv = b(bytes(range(12)))
    out.append(case("seal with a given nonce: nonce, ciphertext, tag", op="seal", link_key=KEY, room_id="compatroom1", plaintext=b(b"hello"), iv=iv))
    out.append(case("sealing nothing leaves nonce and tag", op="seal", link_key=KEY, room_id="compatroom1", plaintext="", iv=iv))
    out.append(case("sealed under another room", op="seal", link_key=KEY, room_id="other-room", plaintext=b(b"hello"), iv=iv))
    out.append(case("a sealed text opens again", op="open", link_key=KEY, room_id="compatroom1", sealed=None))
    out.pop()
    for note, kw in [
        ("meeting link", dict(kind="meeting", id="Room1234567890ab", key="Key1234567890abcdefghij", origin="https://rondel.example.com", pathname="/")),
        ("series link", dict(kind="series", id="Ser1234567890abcd", key="Key1234567890abcdefghij", origin="https://rondel.example.com", pathname="/")),
        ("the app lives under a path", dict(kind="meeting", id="Room1234567890ab", key="K", origin="http://localhost:8787", pathname="/rondel/")),
        ("a share address (claude.ai) uses the dotted form", dict(kind="meeting", id="Room1234567890ab", key="K", origin="x", pathname="/p", share_url="https://claude.ai/public/artifacts/abc")),
        ("a share address loses its own fragment", dict(kind="series", id="Ser1234567890abcd", key="K", origin="x", pathname="/p", share_url="https://claude.ai/a#old")),
    ]:
        out.append(case(note, op="link", **kw))
    for note, h in [
        ("a meeting link", "#/m/Room1234567890ab/Key123"),
        ("a dotted meeting link becomes the normal one", "#m.Room1234567890ab.Key123"),
        ("a dotted series link", "#s.Ser1234567890abcd.Key-_9"),
        ("a series link", "#/s/Ser1234567890abcd/Key123"),
        ("the series overview", "#/s/Ser1234567890abcd/Key123/overview"),
        ("a dotted id shorter than 8 is not dotted", "#m.short.key"),
        ("the data page, also with a suffix", "#/data/anything"),
        ("the crash test only exactly", "#/crash-test"),
        ("crash test with more is home", "#/crash-test/x"),
        ("empty", ""),
        ("a meeting link without a key", "#/m/Room1234567890ab"),
        ("extra path after the key is ignored", "#/m/Room1234567890ab/Key123/extra"),
    ]:
        out.append(case("route: " + note, op="route", hash=h))
    return out
