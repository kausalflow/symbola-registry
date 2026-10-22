package main

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"lightkone-go1/src/lk"
)

type draft struct {
	Key      string            `json:"key"`
	Type     string            `json:"type"`
	Title    string            `json:"title"`
	Authors  []string          `json:"authors"`
	Year     *int              `json:"year,omitempty"`
	Venue    *string           `json:"venue,omitempty"`
	Abstract *string           `json:"abstract,omitempty"`
	Doi      *string           `json:"doi,omitempty"`
	Arxiv    *string           `json:"arxiv,omitempty"`
	URL      *string           `json:"url,omitempty"`
	Tags     []string          `json:"tags"`
	File     *string           `json:"file,omitempty"`
	Notes    *string           `json:"notes,omitempty"`
	Fields   map[string]string `json:"fields"`
}

type parser struct {
	s      string
	macros map[string]string
	out    []draft
}

var months = []string{"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"}

func newParser(s string) *parser {
	p := &parser{s: s, macros: map[string]string{}}
	for i, m := range []string{"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"} {
		p.macros[m] = months[i]
	}
	return p
}

func (p *parser) skipWs(i int) int {
	for i < len(p.s) {
		r, w := utf8.DecodeRuneInString(p.s[i:])
		if !lk.IsSpace(r) {
			break
		}
		i += w
	}
	return i
}

// delimAt reports whether the character at i ends a name or bare word.
func (p *parser) delimAt(i int) bool {
	c := p.s[i]
	if c < 0x80 {
		switch c {
		case ',', '=', '{', '}', '(', ')', '"', '#':
			return true
		}
	}
	r, _ := utf8.DecodeRuneInString(p.s[i:])
	return lk.IsSpace(r)
}

func (p *parser) readName(i int) (string, int) {
	st := i
	for i < len(p.s) && !p.delimAt(i) {
		_, w := utf8.DecodeRuneInString(p.s[i:])
		i += w
	}
	return p.s[st:i], i
}

func (p *parser) braced(i int) (string, int) {
	n := len(p.s)
	depth := 1
	k := i + 1
	for k < n {
		c := p.s[k]
		if c == '\\' {
			k += 2
			continue
		}
		if c == '{' {
			depth++
		} else if c == '}' {
			depth--
			if depth == 0 {
				return p.s[i+1 : k], k + 1
			}
		}
		k++
	}
	if i+1 > n {
		return "", n
	}
	return p.s[i+1 : n], n
}

func (p *parser) quoted(i int) (string, int) {
	n := len(p.s)
	depth := 0
	k := i + 1
	for k < n {
		c := p.s[k]
		if c == '{' {
			depth++
		} else if c == '}' {
			if depth > 0 {
				depth--
			}
		} else if c == '"' && depth == 0 {
			return p.s[i+1 : k], k + 1
		}
		k++
	}
	return p.s[i+1 : n], n
}

func (p *parser) value(i int) (string, int) {
	var sb strings.Builder
	for {
		i = p.skipWs(i)
		if i >= len(p.s) {
			break
		}
		switch p.s[i] {
		case '{':
			var t string
			t, i = p.braced(i)
			sb.WriteString(t)
		case '"':
			var t string
			t, i = p.quoted(i)
			sb.WriteString(t)
		default:
			var w string
			w, i = p.readName(i)
			if m, ok := p.macros[lk.Lower(w)]; ok {
				sb.WriteString(m)
			} else {
				sb.WriteString(w)
			}
		}
		i = p.skipWs(i)
		if i < len(p.s) && p.s[i] == '#' {
			i++
			continue
		}
		break
	}
	return lk.CollapseSpace(sb.String()), i
}

type fieldMap struct {
	m map[string]string
}

// fields reads "name = value" pairs up to the closing character. It returns the position to resume scanning.
func (p *parser) fields(i int, closeCh byte, f map[string]string, isString bool) int {
	n := len(p.s)
	for {
		i = p.skipWs(i)
		if i >= n {
			return n
		}
		if p.s[i] == closeCh {
			return i + 1
		}
		name, ni := p.readName(i)
		ni2 := p.skipWs(ni)
		if name == "" || ni2 >= n || p.s[ni2] != '=' {
			k := ni
			for k < n && p.s[k] != ',' && p.s[k] != closeCh {
				if p.s[k] == '{' {
					_, k = p.braced(k)
				} else if p.s[k] == '"' {
					_, k = p.quoted(k)
				} else {
					k++
				}
			}
			if k >= n {
				return n
			}
			if p.s[k] == closeCh {
				return k + 1
			}
			i = k + 1
			continue
		}
		var v string
		v, i = p.value(ni2 + 1)
		ln := lk.Lower(name)
		f[ln] = v
		if isString {
			p.macros[ln] = v
		}
		i = p.skipWs(i)
		if i < n && p.s[i] == ',' {
			i++
		}
	}
}

func (p *parser) run() {
	n := len(p.s)
	i := 0
	for i < n {
		off := strings.IndexByte(p.s[i:], '@')
		if off < 0 {
			return
		}
		at := i + off
		typ, j := p.readName(at + 1)
		typ = lk.Lower(typ)
		j = p.skipWs(j)
		if j >= n || (p.s[j] != '{' && p.s[j] != '(') {
			i = at + 1
			continue
		}
		if typ == "comment" {
			i = at + 1
			continue
		}
		closeCh := byte('}')
		if p.s[j] == '(' {
			closeCh = ')'
		}
		j++
		switch typ {
		case "preamble":
			_, j = p.value(j)
			j = p.skipWs(j)
			if j < n && p.s[j] == closeCh {
				j++
			}
			i = j
		case "string":
			i = p.fields(j, closeCh, map[string]string{}, true)
		default:
			k := j
			depth := 0
			for k < n {
				c := p.s[k]
				if c == '{' {
					depth++
				} else if c == '}' && depth > 0 {
					depth--
				} else if depth == 0 && (c == ',' || c == closeCh) {
					break
				}
				k++
			}
			key := lk.Trim(p.s[j:k])
			f := map[string]string{}
			if k < n && p.s[k] == ',' {
				i = p.fields(k+1, closeCh, f, false)
			} else if k < n {
				i = k + 1
			} else {
				i = n
			}
			p.emit(typ, key, f)
		}
	}
}

func splitAnd(src string) []string {
	rs := []rune(src)
	n := len(rs)
	var parts []string
	last := 0
	for i := 0; i < n; {
		if !lk.IsSpace(rs[i]) {
			i++
			continue
		}
		j := i
		for j < n && lk.IsSpace(rs[j]) {
			j++
		}
		if j+3 < n && strings.EqualFold(string(rs[j:j+3]), "and") && lk.IsSpace(rs[j+3]) {
			k := j + 3
			for k < n && lk.IsSpace(rs[k]) {
				k++
			}
			parts = append(parts, string(rs[last:i]))
			last = k
			i = k
			continue
		}
		i = j
	}
	return append(parts, string(rs[last:]))
}

var year4 = regexp.MustCompile(`[0-9]{4}`)
var doiPrefix = regexp.MustCompile(`(?i)^https?://(dx\.)?doi\.org/`)
var arxivPrefix = regexp.MustCompile(`(?i)^arxiv:`)
var arxivVerAny = regexp.MustCompile(`(?i)v[0-9]+$`)
var arxivVer = regexp.MustCompile(`v[0-9]+$`)
var arxivURL = regexp.MustCompile(`(?i)arxiv\.org/(?:abs|pdf|html)/([^?#\s]+)`)
var newStyle = regexp.MustCompile(`^[0-9]{4}\.[0-9]{4}`)
var badTag = regexp.MustCompile(`(?i)^(doi|url|arxiv|isbn|issn|pmid|pmc):`)

func cleanArxiv(id string) string {
	id = arxivPrefix.ReplaceAllString(id, "")
	return arxivVer.ReplaceAllString(id, "")
}

func (p *parser) emit(typ, key string, f map[string]string) {
	take := func(name string) (string, bool) {
		v, ok := f[name]
		if ok {
			delete(f, name)
		}
		return v, ok
	}
	rawTitle, _ := take("title")
	title := plain(rawTitle)
	if title == "" {
		return
	}
	d := draft{Key: key, Type: typ, Title: title, Authors: []string{}, Tags: []string{}}
	// authors
	var src string
	if v, ok := take("author"); ok {
		src = v
	} else if v, ok := take("editor"); ok {
		src = v
	}
	if src != "" {
		for _, part := range splitAnd(src) {
			pl := plain(part)
			if pl == "" {
				continue
			}
			if strings.Contains(pl, ",") || lk.Lower(pl) == "others" || (strings.HasPrefix(part, "{") && strings.HasSuffix(part, "}")) {
				d.Authors = append(d.Authors, pl)
				continue
			}
			if idx := strings.LastIndex(pl, " "); idx >= 0 {
				pl = pl[idx+1:] + ", " + pl[:idx]
			}
			d.Authors = append(d.Authors, pl)
		}
	}
	// year
	if v, ok := take("year"); ok {
		if m := year4.FindString(v); m != "" {
			y, _ := strconv.Atoi(m)
			d.Year = &y
		}
	}
	// venue
	venueRaw, _ := take("journal")
	if venueRaw == "" {
		venueRaw, _ = take("booktitle")
	}
	if venueRaw == "" {
		venueRaw = f["publisher"]
	}
	if v := plain(venueRaw); v != "" {
		d.Venue = &v
	}
	if v, ok := take("abstract"); ok {
		if a := plain(v); a != "" {
			d.Abstract = &a
		}
	}
	if v, ok := take("doi"); ok {
		if x := doiPrefix.ReplaceAllString(v, ""); x != "" {
			d.Doi = &x
		}
	}
	if v, ok := take("url"); ok {
		d.URL = &v
	}
	urlVal := ""
	if d.URL != nil {
		urlVal = *d.URL
	}
	if v, ok := take("file"); ok {
		d.File = &v
	}
	if v, ok := take("annote"); ok && v != "" {
		d.Notes = &v
	} else if w, ok2 := take("note"); ok2 {
		d.Notes = &w
	} else if ok {
		d.Notes = &v
	}
	// arxiv
	id := ""
	if v, _ := take("arxivid"); v != "" {
		id = cleanArxiv(v)
	}
	if id == "" {
		isArx := lk.Lower(f["archiveprefix"]) == "arxiv" || lk.Lower(f["eprinttype"]) == "arxiv"
		if ep := f["eprint"]; isArx && ep != "" {
			id = cleanArxiv(ep)
			delete(f, "eprint")
		}
	}
	if id == "" {
		if m := arxivURL.FindStringSubmatch(urlVal); m != nil {
			path := m[1]
			if strings.HasSuffix(strings.ToLower(path), ".pdf") {
				path = path[:len(path)-4]
			}
			id = arxivPrefix.ReplaceAllString(path, "")
			id = arxivVerAny.ReplaceAllString(id, "")
		}
	}
	if id == "" {
		if ep := f["eprint"]; newStyle.MatchString(ep) {
			id = cleanArxiv(ep)
			delete(f, "eprint")
		}
	}
	if id != "" {
		d.Arxiv = &id
		delete(f, "archiveprefix")
		delete(f, "eprinttype")
		delete(f, "primaryclass")
	}
	// tags
	if v, ok := take("keywords"); ok {
		for _, t := range strings.FieldsFunc(v, func(r rune) bool { return r == ';' || r == ',' }) {
			t = plain(t)
			if t == "" || badTag.MatchString(t) {
				continue
			}
			lt := strings.ToLower(t)
			if strings.Contains(lt, "http://") || strings.Contains(lt, "https://") {
				continue
			}
			d.Tags = append(d.Tags, t)
		}
	}
	d.Fields = f
	p.out = append(p.out, d)
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		p := newParser(in.Text)
		p.run()
		if p.out == nil {
			p.out = []draft{}
		}
		return map[string][]draft{"papers": p.out}, nil
	})
}
