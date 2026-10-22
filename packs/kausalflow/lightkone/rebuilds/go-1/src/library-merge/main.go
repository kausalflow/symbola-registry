package main

import (
	"encoding/json"
	"strconv"
	"strings"

	"lightkone-go1/src/lk"
)

type lib struct {
	papers []*lk.Obj
	sync   []lk.Val
}

func readLib(v lk.Val) *lib {
	o, ok := v.(*lk.Obj)
	if !ok {
		return nil
	}
	l := &lib{}
	if ps, ok := o.M["papers"].([]lk.Val); ok {
		for _, p := range ps {
			if po, ok := p.(*lk.Obj); ok {
				l.papers = append(l.papers, po)
			}
		}
	}
	if bs, ok := o.M["bibSync"].([]lk.Val); ok {
		l.sync = bs
	}
	return l
}

func idOf(p *lk.Obj) string {
	s, _ := p.M["id"].(string)
	return s
}

func index(l *lib) (map[string]*lk.Obj, []string) {
	m := map[string]*lk.Obj{}
	var order []string
	if l == nil {
		return m, order
	}
	for _, p := range l.papers {
		id := idOf(p)
		if _, dup := m[id]; !dup {
			order = append(order, id)
		}
		m[id] = p
	}
	return m, order
}

func same(a, b *lk.Obj) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return lk.Equal(a, b)
}

func list(o *lk.Obj, k string) ([]lk.Val, bool) {
	if o == nil {
		return nil, false
	}
	v, ok := o.M[k].([]lk.Val)
	return v, ok
}

func contains(l []lk.Val, x lk.Val) bool {
	for _, y := range l {
		if lk.Equal(x, y) {
			return true
		}
	}
	return false
}

func mergeSet(b, o, t *lk.Obj, k string) []lk.Val {
	bl, _ := list(b, k)
	ol, _ := list(o, k)
	tl, _ := list(t, k)
	out := []lk.Val{}
	add := func(x lk.Val) {
		if contains(out, x) {
			return
		}
		if contains(bl, x) && (!contains(ol, x) || !contains(tl, x)) {
			return
		}
		out = append(out, x)
	}
	for _, x := range ol {
		add(x)
	}
	for _, x := range tl {
		add(x)
	}
	return out
}

func get(o *lk.Obj, k string) (lk.Val, bool) {
	if o == nil {
		return nil, false
	}
	v, ok := o.M[k]
	return v, ok
}

func sameField(a *lk.Obj, b *lk.Obj, k string) bool {
	av, aok := get(a, k)
	bv, bok := get(b, k)
	if aok != bok {
		return false
	}
	return !aok || lk.Equal(av, bv)
}

func mergePaper(b, o, t *lk.Obj) *lk.Obj {
	out := lk.NewObj()
	var keys []string
	seen := map[string]bool{}
	for _, src := range []*lk.Obj{o, t, b} {
		for _, k := range src.Keys {
			if !seen[k] {
				seen[k] = true
				keys = append(keys, k)
			}
		}
	}
	for _, k := range keys {
		if k == "tags" || k == "folders" {
			_, oh := list(o, k)
			_, th := list(t, k)
			if oh || th {
				out.Set(k, mergeSet(b, o, t, k))
				continue
			}
		}
		src := o
		if sameField(o, b, k) {
			src = t
		}
		if v, ok := src.M[k]; ok {
			out.Set(k, v)
		}
	}
	return out
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		root, err := lk.Parse(string(line))
		if err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		ro, ok := root.(*lk.Obj)
		if !ok {
			return nil, lk.Errf("input must be an object")
		}
		base, ours, theirs := readLib(ro.M["base"]), readLib(ro.M["ours"]), readLib(ro.M["theirs"])
		if ours == nil || theirs == nil {
			return nil, lk.Errf("ours and theirs are required")
		}
		bm, _ := index(base)
		om, oorder := index(ours)
		tm, torder := index(theirs)
		ids := append([]string{}, torder...)
		for _, id := range oorder {
			if _, ok := tm[id]; !ok {
				ids = append(ids, id)
			}
		}
		var papers []lk.Val
		fromThem := 0
		for _, id := range ids {
			b, o, t := bm[id], om[id], tm[id]
			var r *lk.Obj
			switch {
			case b == nil:
				r = o
				if r == nil {
					r = t
				}
			case o == nil:
				if t != nil && !same(t, b) {
					r = t
				}
			case t == nil:
				if !same(o, b) {
					r = o
				}
			case same(o, b):
				r = t
			case same(t, b):
				r = o
			default:
				r = mergePaper(b, o, t)
			}
			if !same(r, o) {
				fromThem++
			}
			if r != nil {
				papers = append(papers, r)
			}
		}
		var baseSync []lk.Val
		if base != nil {
			baseSync = base.sync
		}
		sync := theirs.sync
		if !lk.Equal(orEmpty(ours.sync), orEmpty(baseSync)) {
			sync = ours.sync
		}
		file := lk.NewObj()
		file.Set("format", "lightkone-library")
		file.Set("version", lk.Num{F: 1, Raw: "1"})
		if papers == nil {
			papers = []lk.Val{}
		}
		file.Set("papers", papers)
		if len(sync) > 0 {
			file.Set("bibSync", sync)
		}
		var sb strings.Builder
		sb.WriteString(`{"file":`)
		sb.WriteString(lk.Raw(file))
		sb.WriteString(`,"fromThem":`)
		sb.WriteString(strconv.Itoa(fromThem))
		sb.WriteString("}")
		return json.RawMessage(sb.String()), nil
	})
}

func orEmpty(l []lk.Val) []lk.Val {
	if l == nil {
		return []lk.Val{}
	}
	return l
}
