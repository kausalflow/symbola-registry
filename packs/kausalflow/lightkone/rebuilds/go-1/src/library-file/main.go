package main

import (
	"encoding/json"
	"strings"

	"lightkone-go1/src/lk"
)

type output struct {
	Written  bool    `json:"written"`
	Library  string  `json:"library"`
	Bib      *string `json:"bib"`
	Foldered int     `json:"foldered"`
}

func foldersFrom(file string, authors []string) []lk.Val {
	names := map[string]bool{}
	for _, a := range authors {
		n, _, _ := strings.Cut(a, ",")
		if f := lk.Upper(lk.Clean(lk.Trim(n))); f != "" {
			names[f] = true
		}
	}
	authorFolder := func(d string) bool {
		if d == "Other" {
			return true
		}
		if len(names) > 0 {
			return names[d]
		}
		return lk.Upper(d) == d && lk.Lower(d) != d
	}
	out := []lk.Val{}
	seen := map[string]bool{}
	for _, path := range strings.Split(file, ";") {
		path = lk.Trim(path)
		if path == "" {
			continue
		}
		segs := strings.Split(path, "/")
		dirs := segs[:len(segs)-1]
		if len(dirs) > 0 && dirs[0] == "All Papers" {
			dirs = dirs[1:]
		}
		if len(dirs) == 0 {
			continue
		}
		if len(dirs) == 1 && authorFolder(dirs[0]) {
			continue
		}
		f := strings.Join(dirs, "/")
		if !seen[f] {
			seen[f] = true
			out = append(out, f)
		}
	}
	return out
}

func str(o *lk.Obj, k string) string {
	s, _ := o.M[k].(string)
	return s
}

func strList(o *lk.Obj, k string) []string {
	var out []string
	if l, ok := o.M[k].([]lk.Val); ok {
		for _, x := range l {
			s, _ := x.(string)
			out = append(out, s)
		}
	}
	return out
}

func exportPaper(p *lk.Obj) string {
	ep := lk.ExportPaper{
		Key: str(p, "key"), Type: str(p, "type"), Title: str(p, "title"),
		Authors: strList(p, "authors"), Venue: str(p, "venue"), Doi: str(p, "doi"),
		Arxiv: str(p, "arxiv"), URL: str(p, "url"), Abstract: str(p, "abstract"),
		File: str(p, "file"), Tags: strList(p, "tags"),
	}
	if y, ok := p.M["year"].(lk.Num); ok {
		ep.HasYear = true
		ep.Year = lk.JSNumber(y.F)
	}
	if fo, ok := p.M["fields"].(*lk.Obj); ok {
		for _, k := range fo.Keys {
			ep.FieldNames = append(ep.FieldNames, k)
			ep.FieldValues = append(ep.FieldValues, str(fo, k))
		}
	}
	return lk.ExportBib(ep)
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		v, err := lk.Parse(in.Text)
		if err != nil {
			return nil, lk.Errf("library.json is not JSON: %v", err)
		}
		root, ok := v.(*lk.Obj)
		if !ok {
			return nil, lk.Errf("library.json is not an object")
		}
		if f, _ := root.M["format"].(string); f != "lightkone-library" {
			return nil, lk.Errf("not a lightkone library")
		}
		if v, ok := root.M["version"].(lk.Num); ok && v.F > 1 {
			return nil, lk.Errf("library was saved by a newer lightkone (version %s)", v.Raw)
		}
		plist, ok := root.M["papers"].([]lk.Val)
		if !ok {
			return nil, lk.Errf("library has no papers list")
		}
		var papers []*lk.Obj
		for _, p := range plist {
			po, ok := p.(*lk.Obj)
			if !ok {
				return nil, lk.Errf("a paper is not an object")
			}
			papers = append(papers, po)
		}
		foldered := 0
		for _, p := range papers {
			if _, has := p.M["folders"]; has {
				continue
			}
			fl := []lk.Val{}
			if f, ok := p.M["file"].(string); ok {
				fl = foldersFrom(f, strList(p, "authors"))
			}
			if len(fl) > 0 {
				foldered++
			}
			p.Set("folders", fl)
		}
		out := lk.NewObj()
		out.Set("format", "lightkone-library")
		out.Set("version", lk.Num{F: 1, Raw: "1"})
		out.Set("papers", plist)
		if bs, ok := root.M["bibSync"].([]lk.Val); ok && len(bs) > 0 {
			out.Set("bibSync", bs)
		}
		for _, k := range root.Keys {
			switch k {
			case "format", "version", "papers", "bibSync":
			default:
				out.Set(k, root.M[k])
			}
		}
		text := lk.Stringify(out, 1)
		res := output{Library: text, Foldered: foldered}
		if text != in.Text {
			res.Written = true
			parts := []string{}
			for _, p := range papers {
				if truthy(p.M["trashed"]) {
					continue
				}
				parts = append(parts, exportPaper(p))
			}
			b := strings.Join(parts, "\n")
			res.Bib = &b
		}
		return res, nil
	})
}

// truthy is JavaScript truthiness for parsed JSON values.
func truthy(v lk.Val) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case lk.Num:
		return x.F != 0
	}
	return true
}
