package main

import (
	"strings"

	"lightkone-go1/src/lk"
)

func isWS(r rune) bool { return lk.IsSpace(r) }

var accentMarks = map[rune]rune{
	'"': 0x308, '\'': 0x301, '`': 0x300, '^': 0x302, '~': 0x303, '=': 0x304, '.': 0x307,
	'c': 0x327, 'v': 0x30C, 'u': 0x306, 'H': 0x30B,
}

func isASCIILetter(r rune) bool { return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') }

// step1 turns LaTeX accents into letter + combining mark (NFC).
func step1(rs []rune) []rune {
	var out []rune
	n := len(rs)
	for i := 0; i < n; {
		j := i
		if rs[j] == '{' {
			j++
		}
		if j < n && rs[j] == '\\' && j+1 < n {
			c := rs[j+1]
			mark, ok := accentMarks[c]
			good := false
			k := j + 2
			if ok {
				if c == 'c' || c == 'v' || c == 'u' || c == 'H' {
					good = k < n && (isWS(rs[k]) || rs[k] == '{')
				} else {
					good = true
				}
			}
			if good {
				for k < n && isWS(rs[k]) {
					k++
				}
				if k < n && rs[k] == '{' {
					k++
				}
				letter := rune(0)
				if k < n && isASCIILetter(rs[k]) {
					letter = rs[k]
					k++
				} else if k+1 < n && rs[k] == '\\' && (rs[k+1] == 'i' || rs[k+1] == 'j') &&
					!(k+2 < n && (isASCIILetter(rs[k+2]) || (rs[k+2] >= '0' && rs[k+2] <= '9') || rs[k+2] == '_')) {
					letter = rs[k+1]
					k += 2
				}
				if letter != 0 {
					if k < n && rs[k] == '}' {
						k++
					}
					if k < n && rs[k] == '}' {
						k++
					}
					s := string([]rune{letter, mark})
					out = append(out, []rune(lk.ComposeLetter(s))...)
					i = k
					continue
				}
			}
		}
		out = append(out, rs[i])
		i++
	}
	return out
}

var specials = []struct{ name, repl string }{
	{"ss", "ß"}, {"o", "ø"}, {"O", "Ø"}, {"ae", "æ"}, {"AE", "Æ"}, {"l", "ł"}, {"L", "Ł"}, {"i", "ı"},
}

func hasPrefixRunes(rs []rune, at int, s string) bool {
	sr := []rune(s)
	if at+len(sr) > len(rs) {
		return false
	}
	for i, r := range sr {
		if rs[at+i] != r {
			return false
		}
	}
	return true
}

func step2(rs []rune) []rune {
	var out []rune
	n := len(rs)
	for i := 0; i < n; {
		if rs[i] == '{' && i+1 < n && rs[i+1] == '\\' {
			matched := false
			for _, sp := range specials {
				if hasPrefixRunes(rs, i+2, sp.name) {
					e := i + 2 + len(sp.name)
					if e < n && rs[e] == '}' {
						out = append(out, []rune(sp.repl)...)
						i = e + 1
						matched = true
						break
					}
				}
			}
			if matched {
				continue
			}
		}
		if rs[i] == '\\' {
			matched := false
			for _, sp := range specials {
				if hasPrefixRunes(rs, i+1, sp.name) {
					e := i + 1 + len(sp.name)
					if e < n && (isASCIILetter(rs[e]) || (rs[e] >= '0' && rs[e] <= '9') || rs[e] == '_') {
						continue
					}
					if e < n && rs[e] == ' ' {
						e++
					}
					out = append(out, []rune(sp.repl)...)
					i = e
					matched = true
					break
				}
			}
			if matched {
				continue
			}
		}
		out = append(out, rs[i])
		i++
	}
	return out
}

var formatting = []string{"emph", "textit", "textbf", "mathrm", "textrm"}

func step3(rs []rune) []rune {
	var out []rune
	n := len(rs)
	for i := 0; i < n; {
		if rs[i] == '\\' {
			matched := false
			for _, f := range formatting {
				if hasPrefixRunes(rs, i+1, f) {
					k := i + 1 + len(f)
					if k < n && rs[k] == '{' {
						e := k + 1
						for e < n && rs[e] != '{' && rs[e] != '}' {
							e++
						}
						if e < n && rs[e] == '}' {
							out = append(out, rs[k+1:e]...)
							i = e + 1
							matched = true
							break
						}
					}
				}
			}
			if matched {
				continue
			}
		}
		out = append(out, rs[i])
		i++
	}
	return out
}

func step4(rs []rune) []rune {
	var out []rune
	n := len(rs)
	for i := 0; i < n; {
		if rs[i] == '\\' && i+1 < n && strings.ContainsRune("&%$#_{}", rs[i+1]) {
			out = append(out, rs[i+1])
			i += 2
			continue
		}
		out = append(out, rs[i])
		i++
	}
	return out
}

func step5(rs []rune) []rune {
	var out []rune
	for i, r := range rs {
		if (r == '{' || r == '}') && !(i > 0 && rs[i-1] == '\\') {
			continue
		}
		out = append(out, r)
	}
	return out
}

func plain(v string) string {
	if !strings.ContainsAny(v, "\\{}~") {
		return lk.CollapseSpace(v)
	}
	rs := []rune(v)
	rs = step1(rs)
	rs = step2(rs)
	rs = step3(rs)
	rs = step4(rs)
	rs = step5(rs)
	s := strings.ReplaceAll(string(rs), "~", " ")
	return lk.CollapseSpace(s)
}
