package lk

import (
	"strings"
	"unicode/utf8"
)

// ExportPaper is what the BibTeX writer reads. Empty strings are "absent".
type ExportPaper struct {
	Key, Type, Title string
	Authors          []string
	Year             string
	HasYear          bool
	Venue, Doi       string
	Arxiv, URL       string
	Abstract, File   string
	Tags             []string
	FieldNames       []string
	FieldValues      []string
}

func escapeBib(s string) string {
	if !strings.ContainsAny(s, "&%#") {
		return s
	}
	var b strings.Builder
	prev := rune(-1)
	for _, r := range s {
		if (r == '&' || r == '%' || r == '#') && prev != '\\' {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
		prev = r
	}
	return b.String()
}

// ExportBib writes the entry exactly as lightkone does.
func ExportBib(p ExportPaper) string {
	type kv struct{ k, v string }
	var lines []kv
	lines = append(lines, kv{"title", "{" + escapeBib(p.Title) + "}"})
	if len(p.Authors) > 0 {
		parts := make([]string, len(p.Authors))
		for i, a := range p.Authors {
			if strings.Contains(a, ",") || a == "others" {
				parts[i] = a
			} else {
				parts[i] = "{" + a + "}"
			}
		}
		lines = append(lines, kv{"author", strings.Join(parts, " and ")})
	}
	if p.HasYear {
		lines = append(lines, kv{"year", p.Year})
	}
	if p.Venue != "" {
		vf := "journal"
		if p.Type == "inproceedings" || p.Type == "incollection" {
			vf = "booktitle"
		}
		existing := false
		for i, n := range p.FieldNames {
			if n == vf && p.FieldValues[i] != "" {
				existing = true
			}
		}
		if !existing {
			lines = append(lines, kv{vf, escapeBib(p.Venue)})
		}
	}
	if p.Doi != "" {
		lines = append(lines, kv{"doi", p.Doi})
	}
	if p.Arxiv != "" {
		lines = append(lines, kv{"eprint", p.Arxiv}, kv{"archiveprefix", "arXiv"})
	}
	if p.URL != "" {
		lines = append(lines, kv{"url", p.URL})
	}
	if p.Abstract != "" {
		lines = append(lines, kv{"abstract", escapeBib(p.Abstract)})
	}
	if kw := strings.Join(p.Tags, ";"); kw != "" {
		lines = append(lines, kv{"keywords", kw})
	}
	if p.File != "" {
		lines = append(lines, kv{"file", p.File})
	}
	for i, n := range p.FieldNames {
		if p.FieldValues[i] == "" || strings.HasPrefix(n, "lightkone-") {
			continue
		}
		lines = append(lines, kv{n, p.FieldValues[i]})
	}
	w := 0
	for _, l := range lines {
		if n := utf8.RuneCountInString(l.k); n > w {
			w = n
		}
	}
	typ := p.Type
	if typ == "" {
		typ = "misc"
	}
	var b strings.Builder
	b.WriteString("@" + typ + "{" + p.Key + ",\n")
	for i, l := range lines {
		if i > 0 {
			b.WriteString(",\n")
		}
		b.WriteString("  " + l.k + strings.Repeat(" ", w-utf8.RuneCountInString(l.k)) + " = {" + l.v + "}")
	}
	b.WriteString("\n}\n")
	return b.String()
}
