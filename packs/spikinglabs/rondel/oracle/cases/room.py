"""Cases for the room component."""

AUTH = "a-secret-auth-token"
DAY = 86_400_000
T = 1_700_000_000_000


def hello(conn, auth=AUTH, since=0, v=1):
    return {"do": "send", "conn": conn, "frame": {"t": "hello", "v": v, "auth": auth, "since": since}}


def op(conn):
    return {"do": "open", "conn": conn}


def send(conn, **frame):
    return {"do": "send", "conn": conn, "frame": frame}


def upd(conn, id, data):
    return send(conn, t="upd", id=id, data=data)


def run(*events, retention_days=90, **kw):
    return {"retention_days": retention_days, "events": list(events), **kw}


def cases():
    out = []

    def add(note, input):
        out.append({"input": input, "note": note})

    add("welcome for the first client; the second sees the first and the first is told", run(op("a"), hello("a"), op("b"), hello("b")))
    add("updates are stored with increasing numbers, acknowledged with the sender's id, and passed to the others but not back", run(
        op("a"), hello("a"), op("b"), hello("b"), upd("a", 7, "enc1"), upd("b", 3, "enc2"), upd("a", 9, "enc3")))
    add("presence is passed on, never stored or echoed", run(op("a"), hello("a"), op("b"), hello("b"), send("b", t="aw", data="presence"), send("a", t="aw", data=5), send("a", t="ping")))
    add("a later client gets everything stored, or only what is after `since`", run(
        op("a"), hello("a"), upd("a", 1, "x"), upd("a", 2, "y"), upd("a", 3, "z"), {"do": "close", "conn": "a"},
        {"do": "restart"}, op("b"), hello("b"), op("c"), hello("c", since=1), op("d"), {"do": "send", "conn": "d", "frame": {"t": "hello", "v": 1, "auth": AUTH, "since": "nope"}}))
    add("a different link key is refused and the connection closed", run(op("a"), hello("a"), op("x"), hello("x", auth="some-other-auth-token")))
    add("the proof must be a string of at least 16 characters", run(op("a"), hello("a", auth="short"), op("z"), hello("z", auth="thirteen-chars"), op("b"), send("b", t="hello", v=1, since=0), op("c"), hello("c", auth="exactly-16-chars!")))
    add("nothing before hello", run(op("a"), upd("a", 1, "x"), op("b"), send("b", t="ping")))
    add("an old protocol version is told to reload (before any other check)", run(op("a"), hello("a", v=0), op("b"), hello("b", v=2, auth="short")))
    add("not JSON, an unknown message and bad fields", run(
        op("a"), {"do": "send", "conn": "a", "text": "{oops"}, op("b"), hello("b"), send("b", t="nope"), op("c"), hello("c"), send("c", t="upd", id=1), op("d"), hello("d"), send("d", t="compact", upTo=0, data="s"),
        op("e"), hello("e"), send("e", t="compact", upTo=1.5, data="s"), op("f"), hello("f"), send("f", t="compact", upTo=1)))
    add("compaction replaces old entries by one snapshot and keeps the newer ones", run(
        op("a"), hello("a"), *[upd("a", i, f"u{i}") for i in range(1, 6)], send("a", t="compact", upTo=4, data="snap"), upd("a", 6, "u6"), op("b"), hello("b")))
    add("compaction is silent: no reply, nothing sent on", run(op("a"), hello("a"), op("b"), hello("b"), upd("a", 1, "x"), send("a", t="compact", upTo=1, data="snap")))
    add("a connection handed back after the room slept stays authenticated", run(
        op("a"), hello("a"), {"do": "restart"}, {"do": "open", "conn": "b", "authed": True}, {"do": "open", "conn": "c", "authed": True}, upd("b", 1, "xyz"), send("c", t="aw", data="who")))
    add("a connection that leaves tells the others; an unauthenticated one does not", run(
        op("a"), hello("a"), op("b"), hello("b"), op("c"), {"do": "close", "conn": "c"}, {"do": "close", "conn": "b"}))
    add("deleting the meeting tells and closes everyone, empties the room and refuses it afterwards", run(
        op("a"), hello("a"), op("b"), hello("b"), op("w"), upd("a", 1, "secret"), send("b", t="delete"), op("c"), hello("c"), hello("c", auth="another-auth-token-xx")))
    add("an expired room is free again: a new link key may take it", run(
        {"do": "clock", "ms": T}, op("a"), hello("a"), upd("a", 1, "x"), {"do": "close", "conn": "a"}, {"do": "expire", "ms": T + 90 * DAY}, op("b"), hello("b", auth="a-new-auth-token-xx")))
    add("a room holds at most 25,000,000 characters: exactly that many are accepted, one more is refused", run(
        op("a"), hello("a"), *[{**upd("a", i, ""), "data_size": 1_900_000} for i in range(1, 14)], {**upd("a", 14, ""), "data_size": 300_000}, upd("a", 15, "x")))
    add("a frame over 2,000,000 characters", run(op("a"), hello("a"), {"do": "send", "conn": "a", "frame": {"t": "upd", "id": 1}, "data_size": 2_000_000}, op("b"), {"do": "send", "conn": "b", "text_size": 2_000_001}))
    add("a frame of exactly 2,000,000 characters is accepted, one more is not", run(
        op("a"), hello("a"), {**upd("a", 1, ""), "data_size": 1_999_972}, {**upd("a", 2, ""), "data_size": 1_999_973}))
    add("at most 100 connections", run({"do": "open", "conn": "c", "count": 101}))
    add("a second hello is not understood", run(op("a"), hello("a"), hello("a")))
    add("data of an update must be text", run(op("a"), hello("a"), send("a", t="upd", id=1, data=5)))

    # ---- retention
    add("expiry is last write plus retention; null for an empty room or no retention; the welcome says so", run(
        {"do": "clock", "ms": T}, {"do": "expires_at"}, op("a"), hello("a"), {"do": "expires_at"}, upd("a", 1, "x"), {"do": "expires_at"}, op("b"), hello("b"), send("a", t="compact", upTo=1, data="s"), {"do": "expires_at"}))
    add("with retention 0 nothing expires", run({"do": "clock", "ms": T}, op("a"), hello("a"), upd("a", 1, "x"), {"do": "expires_at"}, {"do": "expire", "ms": T + 10 * 365 * DAY}, retention_days=0))
    add("expire: nothing stored, not yet due, open connections postpone it by a day, then due", run(
        {"do": "expire", "ms": T}, {"do": "clock", "ms": T}, op("a"), hello("a"), upd("a", 1, "x"),
        {"do": "expire", "ms": T + 10 * DAY}, {"do": "expire", "ms": T + 91 * DAY}, {"do": "close", "conn": "a"}, {"do": "expire", "ms": T + 91 * DAY}, {"do": "expires_at"}, retention_days=90))
    add("changes move the expiry; presence and joining do not", run(
        {"do": "clock", "ms": T}, op("a"), hello("a"), upd("a", 1, "x"), {"do": "clock", "ms": T + 5 * DAY}, op("b"), hello("b"), send("b", t="aw", data="p"), {"do": "expires_at"},
        upd("b", 1, "y"), {"do": "expires_at"}, retention_days=30))
    add("a deleted room does not expire back to life", run(op("a"), hello("a"), upd("a", 1, "x"), send("a", t="delete"), {"do": "expire", "ms": T + 999 * DAY}, op("b"), hello("b")))

    # ---- room ids
    add("allowed room ids: 8 to 64 characters of letters, digits, - and _", run(room_ids=["abcdefgh", "abcdefg", "A-b_C-d_1234567890", "a" * 64, "a" * 65, "abc def gh", "abcdefgh/", "", "ÄÖÜabcdefgh", "abcdefgh\n"]))
    return out
