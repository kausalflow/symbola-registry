"""Cases for the ai-redaction component."""

KIDS = [{"id": "c1", "name": "Mia"}, {"id": "c2", "name": "Jonas"}]


def call(note, user, reply=None, children=KIDS, child="c1", me="", entries=(), images=0, provider="own-key", system="Summarise the log.", raises=None):
    return {"input": {"children": children, "me": me, "entries": list(entries), "child": child, "system": system, "user": user, "images": images, "provider": provider, "reply": reply}, "note": note, **({"raises": raises} if raises else {})}


def cases():
    return [
        call("names become placeholders and come back in the answer", "Mia had a fever. Her brother Jonas is fine. Anna gave medicine.", {"summary": "[CHILD] was sick, [CHILD 2] was not. [PARENT 1] helped."}, me="Anna"),
        call("the child the call is about is [CHILD]", "Mia and Jonas", "[CHILD] / [CHILD 2]", child="c2"),
        call("the order of children stands if the child is unknown", "Mia and Jonas", "[CHILD] / [CHILD 2]", child="zz"),
        call("case does not matter; a name inside a longer word is left alone", "MIA, mia, Mias, Jonasberg, Mia's toy, Mia-Lou, Ämia, (Jonas)", "ok"),
        call("a letter of any alphabet next to the name stops the replacement", "Miaé ÉMia Mia1 Mia_ 3Mia", "ok"),
        call("people who logged entries are replaced in the order they first appear", "Tom and Sue and anna and Tom", "[PARENT 1] [PARENT 2] [PARENT 3]", me="Anna", entries=[{"by": "Tom"}, {"by": "Sue"}, {"by": "Tom"}, {}, {"by": "Gone", "deleted": True}]),
        call("the longer name wins over the shorter one inside it", "Anna Maria met Anna", "[PARENT 1] / [CHILD]", children=[{"id": "c1", "name": "Anna"}], me="Anna Maria"),
        call("a name of one character is not replaced but uses up its number", "J and Tom", "[PARENT 1] [PARENT 2]", children=[{"id": "c1", "name": "Mia"}], me="J", entries=[{"by": "Tom"}]),
        call("a deleted child's name is replaced too", "Jonas was there", "[CHILD 2]", children=[{"id": "c1", "name": "Mia"}, {"id": "c2", "name": "Jonas", "deleted": True}]),
        call("names are trimmed", "Mia and Jonas", "[CHILD] [CHILD 2]", children=[{"id": "c1", "name": "  Mia "}, {"id": "c2", "name": "Jonas  "}]),
        call("answers are restored at any depth; other values stay", "Mia", {"a": ["[CHILD] x", {"b": "[CHILD]"}], "n": 3, "ok": True, "none": None, "[CHILD]": "key stays"}),
        call("a placeholder the model invented stays as it is", "Mia", "[CHILD 5] and [CHILD]"),
        call("images are attached by the parent's own service", "Page of Mia's book", {"entries": []}, images=1),
        call("several images", "Pages", {"entries": []}, images=3),
        call("on the device model there is no reading of photos", "Mia", "x", images=1, provider="device", raises="ValueError"),
        call("on the device model", "Mia has a cold", "[CHILD] answers", provider="device"),
        call("AI is off", "Mia", "x", provider="off", raises="ValueError"),
        call("off wins over images", "Mia", "x", provider="off", images=2, raises="ValueError"),
        call("a name on a deleted entry is replaced too, in the order the entries appear", "Gone and Tom", "[PARENT 1] and [PARENT 2]", entries=[{"by": "Gone", "deleted": True}, {"by": "Tom"}]),
    ]
