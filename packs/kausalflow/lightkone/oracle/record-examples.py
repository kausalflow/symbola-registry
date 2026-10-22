"""Record golden examples for a lightkone contract by asking the oracle.

    python record-examples.py search-query
    python record-examples.py search-query --holdout

Reads fixtures/<name>-cases.jsonl (one input per line, plus a "note"), runs
each through the built oracle (see build.sh), and writes the answers to the
contract's examples.jsonl. If fixtures/<name>-library.json exists, it is the
"papers" of every case: it is copied into the contract as fixtures/library.json
and each example refers to it with {"$fixture": "library.json"}. Cases may
also refer to the contract's own fixtures with {"$fixture": "name.json"}.

With --holdout, reads fixtures/holdout/<name>-cases.jsonl instead and writes
holdout/<name>.jsonl: examples kept from builders, used by holdout.sh.

The oracle is lightkone itself, so the examples are what lightkone does, not
what we think it does.
"""

import json
import subprocess
import sys
from pathlib import Path

from symbolon.spec import resolve_fixtures

here = Path(__file__).resolve().parent
name = sys.argv[1]
holdout = "--holdout" in sys.argv[2:]
contract = here.parent / "1" / "components" / name / "1"
fixtures = here / "fixtures" / ("holdout" if holdout else "")
target = here / "holdout" / f"{name}.jsonl" if holdout else contract / "examples.jsonl"
library = here / "fixtures" / f"{name}-library.json"
papers = json.loads(library.read_text()) if library.exists() else None
defaults = {"sort": "added"} if papers is not None else {}
if papers is not None and not holdout:
    (contract / "fixtures").mkdir(exist_ok=True)
    (contract / "fixtures" / "library.json").write_text(json.dumps(papers, indent=1, ensure_ascii=False) + "\n")
cases = [json.loads(line) for line in (fixtures / f"{name}-cases.jsonl").read_text().splitlines() if line]

oracle = subprocess.Popen(["node", "impl.mjs"], cwd=here / name, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
target.parent.mkdir(exist_ok=True)
with target.open("w") as out:
    for case in cases:
        note = case.pop("note")
        inp = {**defaults, **case}
        sent = {"papers": papers, **inp} if papers is not None else resolve_fixtures(inp, contract / "fixtures")
        if papers is not None:
            inp = {"papers": {"$fixture": "library.json"}, **inp}
        oracle.stdin.write(json.dumps(sent) + "\n")
        oracle.stdin.flush()
        reply = json.loads(oracle.stdout.readline())
        if "error" in reply:
            sys.exit(f"oracle failed on {case}: {reply['error']}")
        out.write(json.dumps({"input": inp, "output": reply["output"], "note": note}, ensure_ascii=False) + "\n")
oracle.stdin.close()
oracle.wait()
print(f"wrote {len(cases)} examples to {target}")
