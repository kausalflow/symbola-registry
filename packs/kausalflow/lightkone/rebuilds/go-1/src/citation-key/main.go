package main

import (
	"encoding/json"
	"strconv"
	"strings"

	"lightkone-go1/src/lk"
)

type draft struct {
	Title   string   `json:"title"`
	Authors []string `json:"authors"`
	Year    *int64   `json:"year"`
	Key     *string  `json:"key"`
}

type input struct {
	Drafts []draft  `json:"drafts"`
	Taken  []string `json:"taken"`
}

func base(d draft) string {
	raw := ""
	if len(d.Authors) > 0 {
		raw, _, _ = strings.Cut(d.Authors[0], ",")
	}
	var b strings.Builder
	for _, r := range lk.NFKD(raw) {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			b.WriteRune(r)
		}
	}
	last := b.String()
	if last == "" {
		last = "Anon"
	}
	last = strings.ToUpper(last[:1]) + last[1:]
	if d.Year != nil {
		last += strconv.FormatInt(*d.Year, 10)
	}
	return last
}

func suffix(d draft) string {
	var b strings.Builder
	for _, r := range lk.Lower(d.Title) {
		if (r >= 'a' && r <= 'z') || r == ' ' {
			b.WriteRune(r)
		}
	}
	var words []string
	for _, w := range strings.Split(b.String(), " ") {
		if len(w) > 3 {
			words = append(words, w)
		}
	}
	if len(words) == 0 {
		return "xx"
	}
	second := words[0]
	if len(words) > 1 {
		second = words[1]
	}
	return words[0][:1] + second[:1]
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in input
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		taken := map[string]bool{}
		for _, t := range in.Taken {
			taken[t] = true
		}
		keys := []string{}
		for _, d := range in.Drafts {
			var k string
			if d.Key != nil && *d.Key != "" && !taken[*d.Key] {
				k = *d.Key
			} else {
				stem := base(d) + "-" + suffix(d)
				k = stem
				for n := 2; taken[k]; n++ {
					k = stem + strconv.Itoa(n)
				}
			}
			taken[k] = true
			keys = append(keys, k)
		}
		return map[string][]string{"keys": keys}, nil
	})
}
