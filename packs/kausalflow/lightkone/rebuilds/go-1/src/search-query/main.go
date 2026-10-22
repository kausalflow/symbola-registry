package main

import (
	"encoding/json"
	"sort"
	"strconv"
	"strings"

	"golang.org/x/text/collate"
	"golang.org/x/text/language"

	"lightkone-go1/src/lk"
)

type paper struct {
	ID       string    `json:"id"`
	Title    string    `json:"title"`
	Added    string    `json:"added"`
	Key      string    `json:"key"`
	Authors  []string  `json:"authors"`
	Year     *float64  `json:"year"`
	Venue    *string   `json:"venue"`
	Abstract *string   `json:"abstract"`
	Doi      *string   `json:"doi"`
	Arxiv    *string   `json:"arxiv"`
	Tags     []string  `json:"tags"`
	File     *string   `json:"file"`
	Pdf      *string   `json:"pdf"`
	Notes    *string   `json:"notes"`
	Folders  *[]string `json:"folders"`
	Starred  *bool     `json:"starred"`
	Trashed  *string   `json:"trashed"`
	Opened   *string   `json:"opened"`
}

type input struct {
	Papers []paper `json:"papers"`
	Query  string  `json:"query"`
	Sort   string  `json:"sort"`
}

type output struct {
	Ids []string `json:"ids"`
}

func s(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

type term struct {
	filter       bool
	field, value string // filter (field lower-cased)
	word         string
}

func isWordChar(c byte) bool {
	return c == '_' || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

var known = map[string]bool{"tag": true, "author": true, "year": true, "in": true, "has": true, "no": true, "is": true}

func tokenize(q string) []term {
	var out []term
	rs := []rune(q)
	i := 0
	n := len(rs)
	for i < n {
		if lk.IsSpace(rs[i]) {
			i++
			continue
		}
		// field:"quoted" or field:value
		j := i
		for j < n && rs[j] < 0x80 && isWordChar(byte(rs[j])) {
			j++
		}
		if j > i && j < n && rs[j] == ':' {
			field := string(rs[i:j])
			k := j + 1
			if k < n && rs[k] == '"' {
				e := k + 1
				for e < n && rs[e] != '"' {
					e++
				}
				if e < n {
					out = append(out, mk(field, string(rs[k+1:e])))
					i = e + 1
					continue
				}
			}
			e := k
			for e < n && !lk.IsSpace(rs[e]) {
				e++
			}
			if e > k {
				out = append(out, mk(field, string(rs[k:e])))
				i = e
				continue
			}
		}
		if rs[i] == '"' {
			e := i + 1
			for e < n && rs[e] != '"' {
				e++
			}
			if e < n {
				out = append(out, term{word: string(rs[i+1 : e])})
				i = e + 1
				continue
			}
		}
		e := i
		for e < n && !lk.IsSpace(rs[e]) {
			e++
		}
		out = append(out, term{word: string(rs[i:e])})
		i = e
	}
	return out
}

func mk(field, value string) term {
	lf := strings.ToLower(field)
	if known[lf] {
		return term{filter: true, field: lf, value: value}
	}
	return term{word: field + ":" + value}
}

type yearSpec struct {
	lo, hi float64
}

// jsNumber reads ASCII digits with an optional fraction.
func jsNumber(x string) (float64, bool) {
	digits := 0
	dot := false
	for i := 0; i < len(x); i++ {
		c := x[i]
		switch {
		case c >= '0' && c <= '9':
			digits++
		case c == '.' && !dot:
			dot = true
		default:
			return 0, false
		}
	}
	if digits == 0 {
		return 0, false
	}
	f, err := strconv.ParseFloat(x, 64)
	if err != nil {
		return 0, false
	}
	return f, true
}

// parseYear returns nil when the term does not count.
func parseYear(v string) *yearSpec {
	parts := strings.Split(v, "-")
	lo, ok := jsNumber(parts[0])
	if !ok || lo == 0 {
		return nil
	}
	hi := lo
	if len(parts) > 1 {
		if h, ok := jsNumber(parts[1]); ok && h != 0 {
			hi = h
		}
	}
	return &yearSpec{lo, hi}
}

type prepared struct {
	p                   *paper
	title, author, rest string
	idx                 int
	score               int
}

var coll = collate.New(language.Und)

func run(in input) []string {
	var terms []term
	terms = tokenize(in.Query)
	trash := false
	recent := false
	var year *yearSpec
	for _, t := range terms {
		if t.filter && t.field == "is" {
			switch strings.ToLower(t.value) {
			case "trash":
				trash = true
			case "recent":
				recent = true
			}
		}
		if t.filter && t.field == "year" {
			if y := parseYear(t.value); y != nil {
				year = y
			}
		}
	}
	var words []string
	for _, t := range terms {
		if !t.filter {
			words = append(words, lk.Fold(t.word))
		}
	}
	var cand []*prepared
	for i := range in.Papers {
		p := &in.Papers[i]
		if (s(p.Trashed) != "") != trash {
			continue
		}
		ok := true
		for _, t := range terms {
			if !t.filter || t.field == "year" {
				continue
			}
			if !satisfies(p, t) {
				ok = false
				break
			}
		}
		if ok && year != nil {
			ok = p.Year != nil && *p.Year != 0 && year.lo <= *p.Year && *p.Year <= year.hi
		}
		if !ok {
			continue
		}
		pp := &prepared{p: p, idx: i}
		pp.title = lk.Fold(p.Title)
		pp.author = lk.Fold(strings.Join(p.Authors, " ; "))
		var parts []string
		for _, x := range []string{s(p.Abstract), s(p.Venue), strings.Join(p.Tags, " "), p.Key, s(p.Doi), s(p.Arxiv), s(p.Notes)} {
			if x != "" {
				parts = append(parts, x)
			}
		}
		pp.rest = lk.Fold(strings.Join(parts, " "))
		for _, w := range words {
			sc := 0
			if strings.Contains(pp.title, w) {
				sc += 5
			}
			if strings.Contains(pp.author, w) {
				sc += 4
			}
			if strings.Contains(pp.rest, w) {
				sc++
			}
			if sc == 0 {
				ok = false
				break
			}
			pp.score += sc
		}
		if !ok {
			continue
		}
		cand = append(cand, pp)
	}
	mode := in.Sort
	if mode == "" || mode == "added" {
		switch {
		case recent:
			mode = "opened"
		case len(words) > 0:
			mode = "relevance"
		default:
			mode = "added"
		}
	}
	byAdded := func(a, b *prepared) bool { return a.p.Added > b.p.Added }
	sort.SliceStable(cand, func(i, j int) bool {
		a, b := cand[i], cand[j]
		switch mode {
		case "relevance":
			if a.score != b.score {
				return a.score > b.score
			}
			return byAdded(a, b)
		case "year":
			ya, yb := 0.0, 0.0
			if a.p.Year != nil {
				ya = *a.p.Year
			}
			if b.p.Year != nil {
				yb = *b.p.Year
			}
			return ya > yb
		case "title":
			return coll.CompareString(a.p.Title, b.p.Title) < 0
		case "opened":
			oa, ob := s(a.p.Opened), s(b.p.Opened)
			if oa != ob {
				return oa > ob
			}
			return byAdded(a, b)
		}
		return byAdded(a, b)
	})
	ids := make([]string, 0, len(cand))
	for _, c := range cand {
		ids = append(ids, c.p.ID)
	}
	return ids
}

func satisfies(p *paper, t term) bool {
	switch t.field {
	case "tag":
		v := lk.Fold(t.value)
		for _, x := range p.Tags {
			if lk.Fold(x) == v {
				return true
			}
		}
		return false
	case "author":
		return strings.Contains(lk.Fold(strings.Join(p.Authors, " ; ")), lk.Fold(t.value))
	case "in":
		target := strings.TrimRight(lk.Fold(t.value), "/")
		if p.Folders != nil {
			for _, f := range *p.Folders {
				ff := lk.Fold(f)
				if ff == target || strings.HasPrefix(ff, target+"/") {
					return true
				}
			}
		}
		return false
	case "has", "no":
		v := strings.ToLower(t.value)
		has := t.field == "has"
		var present bool
		switch v {
		case "pdf":
			if has {
				present = s(p.Pdf) != "" || s(p.File) != ""
			} else {
				return s(p.Pdf) == ""
			}
		case "abstract":
			present = s(p.Abstract) != ""
		case "arxiv":
			present = s(p.Arxiv) != ""
		case "notes":
			present = s(p.Notes) != ""
		default:
			return true
		}
		return present == has
	case "is":
		switch strings.ToLower(t.value) {
		case "starred":
			return p.Starred != nil && *p.Starred
		case "recent":
			return s(p.Opened) != ""
		}
		return true
	}
	return true
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in input
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		return output{Ids: run(in)}, nil
	})
}
