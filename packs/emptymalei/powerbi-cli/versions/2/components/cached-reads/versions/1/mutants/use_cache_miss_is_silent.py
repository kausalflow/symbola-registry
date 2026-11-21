"""A miss with --use-cache goes to the API without saying so."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    out["lines"] = [line for line in out["lines"] if line != "Cache not available, fetching from API..."]
    return out
