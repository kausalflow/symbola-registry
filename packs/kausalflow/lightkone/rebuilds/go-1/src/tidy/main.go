package main

import (
	"encoding/json"
	"regexp"
	"strings"

	"lightkone-go1/src/lk"
)

type paper struct {
	ID       string            `json:"id"`
	Title    string            `json:"title"`
	Authors  []string          `json:"authors"`
	Added    string            `json:"added"`
	Tags     []string          `json:"tags"`
	Folders  []string          `json:"folders"`
	Year     *int64            `json:"year"`
	Venue    *string           `json:"venue"`
	Abstract *string           `json:"abstract"`
	Doi      *string           `json:"doi"`
	Arxiv    *string           `json:"arxiv"`
	URL      *string           `json:"url"`
	Pdf      *string           `json:"pdf"`
	File     *string           `json:"file"`
	Notes    *string           `json:"notes"`
	Starred  *bool             `json:"starred"`
	Opened   *string           `json:"opened"`
	Trashed  *string           `json:"trashed"`
	Fields   map[string]string `json:"fields"`
}

type input struct {
	Papers []paper `json:"papers"`
}

type patch struct {
	Tags     []string          `json:"tags"`
	Folders  []string          `json:"folders"`
	Notes    *string           `json:"notes,omitempty"`
	Starred  *bool             `json:"starred,omitempty"`
	Fields   map[string]string `json:"fields"`
	Added    string            `json:"added"`
	Abstract *string           `json:"abstract,omitempty"`
	Doi      *string           `json:"doi,omitempty"`
	Arxiv    *string           `json:"arxiv,omitempty"`
	URL      *string           `json:"url,omitempty"`
	Venue    *string           `json:"venue,omitempty"`
	Year     *int64            `json:"year,omitempty"`
	Pdf      *string           `json:"pdf,omitempty"`
	File     *string           `json:"file,omitempty"`
	Opened   *string           `json:"opened,omitempty"`
}

type group struct {
	Ids   []string `json:"ids"`
	Keep  string   `json:"keep"`
	Patch patch    `json:"patch"`
}

var doiPrefix = regexp.MustCompile(`^https?://(dx\.)?doi\.org/`)
var arxivPrefix = regexp.MustCompile(`^arxiv:`)
var arxivVer = regexp.MustCompile(`v[0-9]+$`)

func nz(p *string) bool { return p != nil && *p != "" }

func keysOf(p *paper) []string {
	var out []string
	if nz(p.Doi) {
		d := doiPrefix.ReplaceAllString(lk.Lower(lk.Trim(*p.Doi)), "")
		if d == "" {
			d = "undefined"
		}
		out = append(out, "doi:"+d)
	}
	if nz(p.Arxiv) {
		a := arxivVer.ReplaceAllString(arxivPrefix.ReplaceAllString(lk.Lower(lk.Trim(*p.Arxiv)), ""), "")
		if a == "" {
			a = "undefined"
		}
		out = append(out, "arxiv:"+a)
	}
	var tb strings.Builder
	for _, r := range lk.Lower(lk.NFKD(p.Title)) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			tb.WriteRune(r)
		}
	}
	t := tb.String()
	if len(t) > 20 {
		out = append(out, "title:"+t)
	} else if len(t) > 3 {
		first := ""
		if len(p.Authors) > 0 {
			first, _, _ = strings.Cut(p.Authors[0], ",")
		}
		var sb strings.Builder
		for _, r := range lk.Lower(lk.NFKD(first)) {
			if r >= 'a' && r <= 'z' {
				sb.WriteRune(r)
			}
		}
		out = append(out, "title:"+t+":"+sb.String())
	}
	return out
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in input
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		var live []*paper
		for i := range in.Papers {
			if !nz(in.Papers[i].Trashed) {
				live = append(live, &in.Papers[i])
			}
		}
		parent := make([]int, len(live))
		for i := range parent {
			parent[i] = i
		}
		var find func(int) int
		find = func(x int) int {
			for parent[x] != x {
				parent[x] = parent[parent[x]]
				x = parent[x]
			}
			return x
		}
		owner := map[string]int{}
		for i, p := range live {
			for _, k := range keysOf(p) {
				if o, ok := owner[k]; ok {
					a, b := find(o), find(i)
					if a != b {
						parent[b] = a
					}
				} else {
					owner[k] = i
				}
			}
		}
		members := map[int][]int{}
		var roots []int
		for i := range live {
			r := find(i)
			if _, ok := members[r]; !ok {
				roots = append(roots, r)
			}
			members[r] = append(members[r], i)
		}
		// groups are reported in the order of their first paper; members are in library order
		groups := []group{}
		seen := map[int]bool{}
		for i := range live {
			r := find(i)
			if seen[r] || len(members[r]) < 2 {
				continue
			}
			seen[r] = true
			groups = append(groups, build(live, members[r]))
		}
		return map[string][]group{"groups": groups}, nil
	})
}

func build(live []*paper, idx []int) group {
	g := group{}
	for _, i := range idx {
		g.Ids = append(g.Ids, live[i].ID)
	}
	best := idx[0]
	better := func(a, b *paper) bool { // a strictly better than b
		if nz(a.Pdf) != nz(b.Pdf) {
			return nz(a.Pdf)
		}
		if nz(a.Notes) != nz(b.Notes) {
			return nz(a.Notes)
		}
		return a.Added < b.Added
	}
	for _, i := range idx[1:] {
		if better(live[i], live[best]) {
			best = i
		}
	}
	keep := live[best]
	g.Keep = keep.ID
	order := []*paper{keep}
	for _, i := range idx {
		if i != best {
			order = append(order, live[i])
		}
	}
	others := order[1:]
	pt := patch{Tags: []string{}, Folders: []string{}, Fields: map[string]string{}}
	seenT, seenF := map[string]bool{}, map[string]bool{}
	for _, p := range order {
		for _, t := range p.Tags {
			if !seenT[t] {
				seenT[t] = true
				pt.Tags = append(pt.Tags, t)
			}
		}
		for _, f := range p.Folders {
			if !seenF[f] {
				seenF[f] = true
				pt.Folders = append(pt.Folders, f)
			}
		}
	}
	var notes []string
	seenN := map[string]bool{}
	for _, p := range order {
		if nz(p.Notes) {
			if n := lk.Trim(*p.Notes); n != "" && !seenN[n] {
				seenN[n] = true
				notes = append(notes, n)
			}
		}
		if p.Starred != nil && *p.Starred {
			t := true
			pt.Starred = &t
		}
	}
	if len(notes) > 0 {
		n := strings.Join(notes, "\n\n")
		pt.Notes = &n
	}
	for i := len(order) - 1; i >= 0; i-- {
		for k, v := range order[i].Fields {
			pt.Fields[k] = v
		}
	}
	pt.Added = keep.Added
	for _, p := range others {
		if p.Added < pt.Added {
			pt.Added = p.Added
		}
	}
	fill := func(get func(*paper) *string) *string {
		if nz(get(keep)) {
			return nil
		}
		for _, p := range others {
			if nz(get(p)) {
				v := *get(p)
				return &v
			}
		}
		return nil
	}
	pt.Abstract = fill(func(p *paper) *string { return p.Abstract })
	pt.Doi = fill(func(p *paper) *string { return p.Doi })
	pt.Arxiv = fill(func(p *paper) *string { return p.Arxiv })
	pt.URL = fill(func(p *paper) *string { return p.URL })
	pt.Venue = fill(func(p *paper) *string { return p.Venue })
	pt.Pdf = fill(func(p *paper) *string { return p.Pdf })
	pt.File = fill(func(p *paper) *string { return p.File })
	pt.Opened = fill(func(p *paper) *string { return p.Opened })
	if keep.Year == nil || *keep.Year == 0 {
		for _, p := range others {
			if p.Year != nil && *p.Year != 0 {
				y := *p.Year
				pt.Year = &y
				break
			}
		}
	}
	g.Patch = pt
	return g
}
