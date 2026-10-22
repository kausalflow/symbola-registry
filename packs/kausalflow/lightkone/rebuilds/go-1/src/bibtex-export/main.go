package main

import (
	"encoding/json"
	"strconv"

	"lightkone-go1/src/lk"
)

type input struct {
	Paper struct {
		Key      string   `json:"key"`
		Type     string   `json:"type"`
		Title    string   `json:"title"`
		Authors  []string `json:"authors"`
		Year     *int64   `json:"year"`
		Venue    *string  `json:"venue"`
		Doi      *string  `json:"doi"`
		Arxiv    *string  `json:"arxiv"`
		URL      *string  `json:"url"`
		Abstract *string  `json:"abstract"`
		Tags     []string `json:"tags"`
		File     *string  `json:"file"`
		Fields   *lk.Obj  `json:"-"`
	} `json:"paper"`
}

func s(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func main() {
	lk.Serve(func(line []byte) (interface{}, error) {
		var in input
		if err := json.Unmarshal(line, &in); err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		// fields keep their given order, so read them with the ordered parser
		v, err := lk.Parse(string(line))
		if err != nil {
			return nil, lk.Errf("bad input: %v", err)
		}
		p := in.Paper
		ep := lk.ExportPaper{Key: p.Key, Type: p.Type, Title: p.Title, Authors: p.Authors,
			Venue: s(p.Venue), Doi: s(p.Doi), Arxiv: s(p.Arxiv), URL: s(p.URL),
			Abstract: s(p.Abstract), File: s(p.File), Tags: p.Tags}
		if p.Year != nil {
			ep.HasYear = true
			ep.Year = strconv.FormatInt(*p.Year, 10)
		}
		if root, ok := v.(*lk.Obj); ok {
			if po, ok := root.M["paper"].(*lk.Obj); ok {
				if fo, ok := po.M["fields"].(*lk.Obj); ok {
					for _, k := range fo.Keys {
						ep.FieldNames = append(ep.FieldNames, k)
						str, _ := fo.M[k].(string)
						ep.FieldValues = append(ep.FieldValues, str)
					}
				}
			}
		}
		return map[string]string{"text": lk.ExportBib(ep)}, nil
	})
}
