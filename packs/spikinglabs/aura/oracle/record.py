"""Record golden examples for a component by asking the original (the oracle).

    python oracle/record.py merge

Reads oracle/cases/<name>.py, whose cases() returns a list of {"input": ..., "note": ...} (or with
"raises": "ValueError" for a case the original must reject). Runs each through the oracle adapter in
oracle/<name>/ (the command in its symbolon-impl.toml) and writes
versions/1/components/<name>/versions/1/examples.jsonl.
"""

import importlib.util
import json
import subprocess
import sys
import tomllib
from pathlib import Path

from symbola.spec import resolve_fixtures

here = Path(__file__).resolve().parent
name = sys.argv[1]
contract = here.parent / "versions" / "1" / "components" / name / "versions" / "1"
spec = importlib.util.spec_from_file_location("cases", here / "cases" / f"{name}.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
cases = mod.cases()

manifest = tomllib.loads((here / name / "symbolon-impl.toml").read_text())["implementation"]
oracle = subprocess.Popen(manifest["command"], cwd=here / name, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
with (contract / "examples.jsonl").open("w") as out:
    for case in cases:
        sent = resolve_fixtures(case["input"], contract / "fixtures")
        oracle.stdin.write(json.dumps(sent) + "\n")
        oracle.stdin.flush()
        reply = json.loads(oracle.stdout.readline())
        raises = case.get("raises")
        if raises:
            if reply.get("error", {}).get("type") != raises:
                sys.exit(f"expected {raises} on {case['note']}, oracle gave {reply}")
            row = {"input": case["input"], "raises": raises, "note": case["note"]}
        else:
            if "error" in reply:
                sys.exit(f"oracle failed on {case['note']}: {reply['error']}")
            row = {"input": case["input"], "output": reply["output"], "note": case["note"]}
        out.write(json.dumps(row, ensure_ascii=False) + "\n")
oracle.stdin.close()
print(f"wrote {len(cases)} examples for {name}")
