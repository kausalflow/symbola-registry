"""Cases for the save-guard component."""

COLL = ["children", "episodes", "entries", "meds", "measurements", "growth", "products", "vaccines", "checkups", "dental", "appts", "emergency", "docs", "pages"]


def log(n=0, v=3, **kw):
    s = {"app": "aura", "v": v, "settings": {}, **{k: [] for k in COLL}}
    s["entries"] = [{"id": f"e{i}"} for i in range(n)]
    return {**s, **kw}


def step(state, shrink=False):
    return {"state": state, **({"allow_shrink": True} if shrink else {})}


def case(note, *steps):
    return {"input": {"steps": list(steps)}, "note": note}


def cases():
    return [
        case("the first save passes, growing and equal ones too, a smaller one is refused", step(log(3)), step(log(5)), step(log(5)), step(log(4))),
        case("a refused shrink does not lower the bar", step(log(5)), step(log(2)), step(log(4)), step(log(5))),
        case("a log with more items in other collections than before passes", step(log(2)), step(log(1, children=[{"id": "c1"}, {"id": "c2"}]))),
        case("the count is over all collections", step(log(1, pages=[{"id": "p"}, {"id": "q"}])), step(log(2, pages=[]))),
        case("example data may be replaced by a smaller log", step(log(6, example=True)), step(log(0)), step(log(3))),
        case("allow_shrink lets a deliberate delete through, once", step(log(6)), step(log(1), True), step(log(0))),
        case("allow_shrink is used up by the next save attempt, even one refused as malformed", step(log(4)), step({**log(1), "settings": None}, True), step(log(2))),
        case("a log from a newer app is never saved", step(log(1)), step(log(1, v=4)), step(log(2, v=99))),
        case("a missing settings, a non-list collection, an item without id", step(log(1, settings=None)), step({k: v for k, v in log(1).items() if k != "settings"}), step(log(1, entries={"id": "x"})), step(log(1, entries=[{"note": "no id"}])), step(log(1, entries=[None])), step(log(1, entries=[{"id": None}]))),
        case("ids 0 and empty text are valid ids", step(log(0, entries=[{"id": 0}, {"id": ""}]))),
        case("a missing collection is malformed", step({k: v for k, v in log(1).items() if k != "docs"})),
        case("not an object", step(None), step([]), step("log")),
        case("a log with only a few items still has to be at least as big as the last save", step(log(1)), step(log(0))),
    ]
