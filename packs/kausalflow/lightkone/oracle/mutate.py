"""Generate inputs for differential.py by mutating the string leaves of a
contract's example inputs: python3 mutate.py <name> <count> [seed]."""
import json, random, sys, copy
from symbolon.spec import load_examples
name=sys.argv[1]; n=int(sys.argv[2]); random.seed(int(sys.argv[3]) if len(sys.argv)>3 else 1)
base=str(__import__("pathlib").Path(__file__).resolve().parent.parent)
ex=[e["input"] for e in load_examples(f"{base}/1/components/{name}/1/examples.jsonl")]
NASTY=["", " ", "  ", "\t", "\n", "-", " - ", "{", "}", "\\", "\"", ",", ";", "/", "é", "É", "ß", "Ł", "ø", "İ", "ı", "Σ", "ς", "李", "🙂", " ", " ", "́", "A", "z", "0", "12", "_", ".", ":", "@", "%", "&", "#", "~", "'", "(", ")", "All Papers/", "HINTON", "et al", "and", "others", "v2", "V2", "doi.org/", "https://", "arXiv:", "  x  "]
def leaves(v, path=()):
    if isinstance(v,str): yield path
    elif isinstance(v,list):
        for i,x in enumerate(v): yield from leaves(x,path+(i,))
    elif isinstance(v,dict):
        for k,x in v.items(): yield from leaves(x,path+(k,))
def setp(v,path,new):
    for p in path[:-1]: v=v[p]
    v[path[-1]]=new
def getp(v,path):
    for p in path: v=v[p]
    return v
out=[]
for _ in range(n):
    x=copy.deepcopy(random.choice(ex)); ls=list(leaves(x))
    if not ls: continue
    for _ in range(random.randint(1,3)):
        p=random.choice(ls); s=getp(x,p); i=random.randint(0,len(s))
        op=random.random()
        if op<0.5: s=s[:i]+random.choice(NASTY)+s[i:]
        elif op<0.7: s=s[:i]+s[i+random.randint(1,4):]
        elif op<0.85: s=s.upper()
        else: s=random.choice(NASTY)
        setp(x,p,s)
    out.append(x)
for o in out: print(json.dumps(o))
