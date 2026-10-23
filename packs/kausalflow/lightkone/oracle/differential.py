"""Differential test: send the same inputs to lightkone (oracle/<name>) and a
rebuild, and print every disagreement on inputs the contract's Input accepts.

    python3 oracle/mutate.py bibtex-import 2000 9 > /tmp/cases.jsonl
    python3 oracle/differential.py bibtex-import /tmp/cases.jsonl rebuilds/go-1

Passing a spec only shows a build agrees on the cases the spec samples; this
finds the inputs where two passing builds still differ, i.e. spec gaps.
"""
import json, subprocess, sys
base=str(__import__("pathlib").Path(__file__).resolve().parent.parent)
def proc(d): return subprocess.Popen(["node","impl.mjs"] if "oracle" in d else ["./impl"],cwd=d,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def ask(p,x):
    p.stdin.write(json.dumps(x)+"\n"); p.stdin.flush(); return json.loads(p.stdout.readline())
name=sys.argv[1]; cases=[json.loads(l) for l in open(sys.argv[2]).read().split("\n") if l]
a=proc(f"{base}/oracle/{name}"); b=proc(f"{sys.argv[3]}/{name}")
import importlib.util
spec=importlib.util.spec_from_file_location("schema_"+name.replace("-","_"), f"{base}/versions/1/components/{name}/versions/1/schema.py")
schema=importlib.util.module_from_spec(spec); spec.loader.exec_module(schema)
def ok(c):
    try: schema.Input.model_validate(c); return True
    except Exception: return False
cases=[c for c in cases if ok(c)]
n=0
for c in cases:
    ra,rb=ask(a,c),ask(b,c)
    if "error" in ra: ra={"error":ra["error"]["type"]}
    if "error" in rb: rb={"error":rb["error"]["type"]}
    if ra!=rb:
        n+=1; print("INPUT",json.dumps({k:v for k,v in c.items() if k!="papers"},ensure_ascii=False)[:400]); print(" lightkone",json.dumps(ra,ensure_ascii=False)[:500]); print(" go       ",json.dumps(rb,ensure_ascii=False)[:500])
print(f"{name}: {n} of {len(cases)} differ")
