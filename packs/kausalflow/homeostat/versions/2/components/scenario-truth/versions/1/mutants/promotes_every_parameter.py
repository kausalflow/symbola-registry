"""Parameters are promoted to signals whether or not an event targets them (here: the gains and time constants)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for op in input["scenario"]["custom"]:
        for param in ("K", "tau"):
            path = f"{op['id']}.{param}"
            if op["op"] == "first_order" and path not in out["promoted"]:
                out["promoted"][path] = {"operator": op["id"], "parameter": param}
                out["causal_graph"]["nodes"].append(path)
    out["causal_graph"]["nodes"].sort()
    out["promoted"] = dict(sorted(out["promoted"].items()))
    return out
