"""The version keeps the fraction of the second, so two saves in one second differ."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["op"] == "entry" and "." in input["now"]:
        stamp = out["version"] + input["now"].split(".")[1]
        out["document"]["version"] = out["version"] = stamp
        out["paths"] = [f"{input['cache_key']}/{stamp}/{input['cache_key']}.json"]
    return out
