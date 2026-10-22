package main

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	"lightkone-go1/src/lk"
)

type input struct {
	Paper struct {
		ID      string   `json:"id"`
		Title   string   `json:"title"`
		Authors []string `json:"authors"`
		Year    *int64   `json:"year"`
	} `json:"paper"`
	Library []struct {
		ID   string  `json:"id"`
		Pdf  *string `json:"pdf"`
		File *string `json:"file"`
	} `json:"library"`
}

var dashRuns = regexp.MustCompile(`( - ){2,}`)

func clean(s string) string {
	s = strings.ReplaceAll(s, "---", "—")
	s = strings.ReplaceAll(s, "--", "–")
	for _, c := range []string{":", "/", "\\", "?", "*", "\"", "<", ">", "|"} {
		s = strings.ReplaceAll(s, c, " - ")
	}
	s = lk.CollapseSpaceKeep(s)
	s = dashRuns.ReplaceAllString(s, " - ")
	return strings.Trim(s, " -")
}

func surname(a string) string {
	n, _, _ := strings.Cut(a, ",")
	return lk.Trim(n)
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in input
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		p := in.Paper
		folder := "Other"
		if len(p.Authors) > 0 {
			if f := lk.Upper(clean(surname(p.Authors[0]))); surname(p.Authors[0]) != "" && f != "" {
				folder = f
			}
		}
		title := clean(p.Title)
		if title == "" {
			title = "Untitled"
		}
		var names []string
		for _, a := range p.Authors {
			if sn := surname(a); sn != "" {
				names = append(names, sn)
			}
		}
		var who string
		switch len(names) {
		case 0:
			who = title
		case 1:
			who = names[0]
		case 2:
			who = names[0] + " and " + names[1]
		default:
			who = names[0] + " et al."
		}
		if lk.UTF16Len(who) > 40 {
			who = lk.UTF16Slice(who, 0, 37) + "..."
		}
		var head string
		if p.Year != nil {
			head = clean(who + " " + strconv.FormatInt(*p.Year, 10))
		} else {
			head = clean(who)
		}
		name := head + " - " + title
		if lk.UTF16Len(name) > 146 {
			first := strings.TrimRightFunc(lk.UTF16Slice(name, 0, 72), lk.IsSpace)
			n := lk.UTF16Len(name)
			last := strings.TrimLeftFunc(lk.UTF16Slice(name, n-69, n), lk.IsSpace)
			name = first + " ... " + last
		}
		taken := map[string]bool{}
		for _, l := range in.Library {
			if l.ID == p.ID {
				continue
			}
			if l.Pdf != nil {
				taken[*l.Pdf] = true
			}
			if l.File != nil {
				for _, part := range strings.Split(*l.File, ";") {
					taken["papers/"+lk.Trim(part)] = true
				}
			}
		}
		prefix := "All Papers/" + folder + "/"
		file := prefix + name + ".pdf"
		for n := 2; taken["papers/"+file]; n++ {
			file = prefix + name + " (" + strconv.Itoa(n) + ").pdf"
		}
		return map[string]string{"pdf": "papers/" + file, "file": file}, nil
	})
}
