"""Cases for the media-pack component."""
import base64
import hashlib

b = lambda raw: base64.b64encode(raw).decode()
JPG = "data:image/jpeg;base64," + b(b"\xff\xd8\xff\xe0jpeg bytes")
PNG = "data:image/png;base64," + b(b"\x89PNG....")
WEBM = "data:audio/webm;codecs=opus;base64," + b(b"\x1aE\xdf\xa3audio")


def name(url, ext):
    return hashlib.sha256(url.encode()).hexdigest() + "." + ext


def pack(note, data, existing=()):
    return {"input": {"op": "pack", "data": data, "existing": list(existing)}, "note": note}


def unpack(note, data, media=None):
    return {"input": {"op": "unpack", "data": data, "media": media or {}}, "note": note}


def cases():
    log = {"app": "aura", "v": 3, "entries": [{"id": "e1", "type": "photo", "img": JPG, "note": "rash"}, {"id": "e2", "type": "sound", "audio": WEBM, "secs": 12}, {"id": "e3", "type": "note", "note": "plain"}],
           "pages": [{"id": "p1", "docId": "d1", "img": JPG}, {"id": "p2", "docId": "d1", "img": PNG}], "settings": {"avatar": JPG}}
    ref = lambda url, ext: f"aura-media:{name(url, ext)}#{url.split(',')[0]}"
    packed = {"app": "aura", "v": 3, "entries": [{"id": "e1", "type": "photo", "img": ref(JPG, "jpeg"), "note": "rash"}, {"id": "e2", "type": "sound", "audio": ref(WEBM, "webm"), "secs": 12}, {"id": "e3", "type": "note", "note": "plain"}],
              "pages": [{"id": "p1", "docId": "d1", "img": ref(JPG, "jpeg")}, {"id": "p2", "docId": "d1", "img": ref(PNG, "png")}], "settings": {"avatar": JPG}}
    media = {name(JPG, "jpeg"): b(b"\xff\xd8\xff\xe0jpeg bytes"), name(PNG, "png"): b(b"\x89PNG...."), name(WEBM, "webm"): b(b"\x1aE\xdf\xa3audio")}
    return [
        pack("pictures and sounds become references; the same picture is one file; settings are left alone", log),
        pack("files already in the media folder are not uploaded again", log, [name(JPG, "jpeg")]),
        pack("a log without media comes back as it is", {"app": "aura", "v": 3, "entries": [{"id": "e", "note": "x"}], "children": []}),
        pack("only base64 data URLs count; nested values stay", {"entries": [{"id": "e1", "img": "data:text/plain,hello", "link": "https://example.org/a.jpg", "list": [JPG], "sub": {"img": JPG}}]}),
        pack("odd MIME types: svg+xml keeps its plus, a type without a subtype is bin, odd characters go", {"docs": [
            {"id": "a", "img": "data:image/svg+xml;base64,PHN2Zz4="}, {"id": "b", "img": "data:application;base64,AAEC"}, {"id": "c", "img": "data:x/we!rd$;base64,AAEC"}]}),
        unpack("references are put back", packed, media),
        unpack("an item whose file is missing is left out and counted; the others stay", packed, {name(JPG, "jpeg"): media[name(JPG, "jpeg")]}),
        unpack("nothing to restore", {"app": "aura", "entries": [{"id": "e1", "img": JPG}]}),
        unpack("a reference without a header cannot be restored", {"entries": [{"id": "e1", "img": f"aura-media:{name(JPG, 'jpeg')}"}, {"id": "e2", "note": "kept"}]}, media),
        unpack("an item with two missing references counts once", {"entries": [{"id": "e1", "img": "aura-media:nope.jpeg#data:image/jpeg;base64", "audio": "aura-media:nope2.webm#data:audio/webm;base64"}]}),
    ]
