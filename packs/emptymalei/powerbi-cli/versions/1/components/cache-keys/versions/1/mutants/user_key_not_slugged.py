"""The user id goes into the key as given."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["op"] == "key" and input["command"] == "users user-access":
        out["cache_key"] = "user_access_" + input["user_id"]
    return out
