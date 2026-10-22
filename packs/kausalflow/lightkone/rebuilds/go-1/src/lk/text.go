// Package lk holds the helpers shared by the lightkone component programs.
package lk

import (
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	sBase  = 0xAC00
	lBase  = 0x1100
	vBase  = 0x1161
	tBase  = 0x11A7
	lCount = 19
	vCount = 21
	tCount = 28
	nCount = vCount * tCount
	sCount = lCount * nCount
)

// NFKD returns the compatibility decomposition of s (as Python's unicodedata.normalize("NFKD", s)).
func NFKD(s string) string {
	ascii := true
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			ascii = false
			break
		}
	}
	if ascii {
		return s
	}
	var rs []rune
	for _, r := range s {
		if r >= sBase && r < sBase+sCount {
			si := int(r) - sBase
			rs = append(rs, rune(lBase+si/nCount), rune(vBase+(si%nCount)/tCount))
			if t := si % tCount; t != 0 {
				rs = append(rs, rune(tBase+t))
			}
			continue
		}
		if d, ok := nfkdTable[r]; ok {
			rs = append(rs, []rune(d)...)
		} else {
			rs = append(rs, r)
		}
	}
	// canonical ordering
	for i := 0; i < len(rs); {
		if cccTable[rs[i]] == 0 {
			i++
			continue
		}
		j := i
		for j < len(rs) && cccTable[rs[j]] != 0 {
			j++
		}
		seg := rs[i:j]
		sort.SliceStable(seg, func(a, b int) bool { return cccTable[seg[a]] < cccTable[seg[b]] })
		i = j
	}
	return string(rs)
}

func isCased(r rune) bool {
	return unicode.IsUpper(r) || unicode.IsLower(r) || unicode.IsTitle(r)
}

func isCaseIgnorable(r rune) bool {
	return unicode.In(r, unicode.Mn, unicode.Me, unicode.Cf, unicode.Lm, unicode.Sk) || r == '\'' || r == '.' || r == ':' || r == '^' || r == '`' || r == 0xB7 || r == 0x2019
}

// Lower is Python's str.lower (full case mapping, final sigma).
func Lower(s string) string {
	ascii := true
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			ascii = false
			break
		}
	}
	if ascii {
		return strings.ToLower(s)
	}
	rs := []rune(s)
	var b strings.Builder
	for i, r := range rs {
		if r == 0x3A3 {
			before := false
			for j := i - 1; j >= 0; j-- {
				if isCaseIgnorable(rs[j]) {
					continue
				}
				before = isCased(rs[j])
				break
			}
			after := false
			for j := i + 1; j < len(rs); j++ {
				if isCaseIgnorable(rs[j]) {
					continue
				}
				after = isCased(rs[j])
				break
			}
			if before && !after {
				b.WriteRune('ς')
			} else {
				b.WriteRune('σ')
			}
			continue
		}
		if d, ok := lowerTable[r]; ok {
			b.WriteString(d)
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Upper is Python's str.upper / JavaScript's toUpperCase (full case mapping).
func Upper(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r < 0x80 {
			if r >= 'a' && r <= 'z' {
				r -= 32
			}
			b.WriteRune(r)
			continue
		}
		if d, ok := upperTable[r]; ok {
			b.WriteString(d)
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Fold is search folding: NFKD, drop U+0300..U+036F, lower-case.
func Fold(s string) string {
	d := NFKD(s)
	var b strings.Builder
	for _, r := range d {
		if r >= 0x300 && r <= 0x36F {
			continue
		}
		b.WriteRune(r)
	}
	return Lower(b.String())
}

// IsSpace reports whether r is a whitespace character for trim/\s purposes (JavaScript's set).
func IsSpace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF:
		return true
	}
	return r >= 0x2000 && r <= 0x200A
}

// Trim removes leading and trailing whitespace.
func Trim(s string) string { return strings.TrimFunc(s, IsSpace) }

// CollapseASCII collapses runs of ASCII space, tab, CR, LF to one space and trims them.
func CollapseASCII(s string) string {
	var b strings.Builder
	pending := false
	started := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == ' ' || c == '\t' || c == '\r' || c == '\n' {
			pending = true
			continue
		}
		if pending && started {
			b.WriteByte(' ')
		}
		pending = false
		started = true
		b.WriteByte(c)
	}
	return b.String()
}

// CollapseSpace collapses runs of IsSpace characters to one space and trims.
func CollapseSpace(s string) string {
	var b strings.Builder
	pending := false
	started := false
	for _, r := range s {
		if IsSpace(r) {
			pending = true
			continue
		}
		if pending && started {
			b.WriteByte(' ')
		}
		pending = false
		started = true
		b.WriteRune(r)
	}
	return b.String()
}

// UTF16Len counts UTF-16 code units.
func UTF16Len(s string) int {
	n := 0
	for _, r := range s {
		if r >= 0x10000 {
			n += 2
		} else {
			n++
		}
	}
	return n
}

// UTF16Slice returns code units [a,b) of s.
func UTF16Slice(s string, a, b int) string {
	u := utf16Encode(s)
	if b > len(u) {
		b = len(u)
	}
	if a < 0 {
		a = 0
	}
	if a >= b {
		return ""
	}
	return utf16Decode(u[a:b])
}

func utf16Encode(s string) []uint16 {
	var out []uint16
	for _, r := range s {
		if r >= 0x10000 {
			r -= 0x10000
			out = append(out, uint16(0xD800+(r>>10)), uint16(0xDC00+(r&0x3FF)))
		} else {
			out = append(out, uint16(r))
		}
	}
	return out
}

func utf16Decode(u []uint16) string {
	var b strings.Builder
	for i := 0; i < len(u); i++ {
		c := rune(u[i])
		if c >= 0xD800 && c < 0xDC00 && i+1 < len(u) && u[i+1] >= 0xDC00 && u[i+1] < 0xE000 {
			c = 0x10000 + (c-0xD800)<<10 + (rune(u[i+1]) - 0xDC00)
			i++
		} else if c >= 0xD800 && c < 0xE000 {
			c = utf8.RuneError
		}
		b.WriteRune(c)
	}
	return b.String()
}

// CollapseSpaceKeep collapses runs of whitespace to one space without trimming.
func CollapseSpaceKeep(s string) string {
	var b strings.Builder
	pending := false
	for _, r := range s {
		if IsSpace(r) {
			pending = true
			continue
		}
		if pending {
			b.WriteByte(' ')
			pending = false
		}
		b.WriteRune(r)
	}
	if pending {
		b.WriteByte(' ')
	}
	return b.String()
}

// ComposeLetter returns the NFC form of an ASCII letter followed by one combining mark.
func ComposeLetter(s string) string {
	if c, ok := composeTable[s]; ok {
		return c
	}
	return s
}
