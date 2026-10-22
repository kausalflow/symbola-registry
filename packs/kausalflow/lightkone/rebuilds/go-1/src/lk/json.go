package lk

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Val is a parsed JSON value: nil, bool, string, Num, []Val or *Obj.
type Val interface{}

// Num is a JSON number; Raw is its source text.
type Num struct {
	F   float64
	Raw string
}

// Obj is a JSON object with insertion order (duplicate keys: last value, first position).
type Obj struct {
	Keys []string
	M    map[string]Val
}

func NewObj() *Obj { return &Obj{M: map[string]Val{}} }

func (o *Obj) Set(k string, v Val) {
	if _, ok := o.M[k]; !ok {
		o.Keys = append(o.Keys, k)
	}
	o.M[k] = v
}

func (o *Obj) Get(k string) (Val, bool) { v, ok := o.M[k]; return v, ok }

func (o *Obj) Delete(k string) {
	if _, ok := o.M[k]; !ok {
		return
	}
	delete(o.M, k)
	for i, x := range o.Keys {
		if x == k {
			o.Keys = append(o.Keys[:i:i], o.Keys[i+1:]...)
			break
		}
	}
}

// ValueError is the error type the contracts expect for invalid input.
type ValueError struct{ Msg string }

func (e *ValueError) Error() string { return e.Msg }

func Errf(format string, a ...interface{}) error { return &ValueError{fmt.Sprintf(format, a...)} }

type parser struct {
	s string
	i int
}

// Parse parses strict JSON (RFC 8259) text.
func Parse(text string) (Val, error) {
	p := &parser{s: text}
	p.ws()
	v, err := p.value(0)
	if err != nil {
		return nil, err
	}
	p.ws()
	if p.i != len(p.s) {
		return nil, errors.New("extra data")
	}
	return v, nil
}

func (p *parser) ws() {
	for p.i < len(p.s) {
		switch p.s[p.i] {
		case ' ', '\t', '\n', '\r':
			p.i++
		default:
			return
		}
	}
}

func (p *parser) value(depth int) (Val, error) {
	if depth > 2000 {
		return nil, errors.New("too deep")
	}
	if p.i >= len(p.s) {
		return nil, errors.New("unexpected end")
	}
	switch c := p.s[p.i]; {
	case c == '{':
		p.i++
		o := NewObj()
		p.ws()
		if p.i < len(p.s) && p.s[p.i] == '}' {
			p.i++
			return o, nil
		}
		for {
			p.ws()
			if p.i >= len(p.s) || p.s[p.i] != '"' {
				return nil, errors.New("expected key")
			}
			k, err := p.str()
			if err != nil {
				return nil, err
			}
			p.ws()
			if p.i >= len(p.s) || p.s[p.i] != ':' {
				return nil, errors.New("expected colon")
			}
			p.i++
			p.ws()
			v, err := p.value(depth + 1)
			if err != nil {
				return nil, err
			}
			o.Set(k, v)
			p.ws()
			if p.i >= len(p.s) {
				return nil, errors.New("unexpected end")
			}
			if p.s[p.i] == ',' {
				p.i++
				continue
			}
			if p.s[p.i] == '}' {
				p.i++
				return o, nil
			}
			return nil, errors.New("expected , or }")
		}
	case c == '[':
		p.i++
		arr := []Val{}
		p.ws()
		if p.i < len(p.s) && p.s[p.i] == ']' {
			p.i++
			return arr, nil
		}
		for {
			p.ws()
			v, err := p.value(depth + 1)
			if err != nil {
				return nil, err
			}
			arr = append(arr, v)
			p.ws()
			if p.i >= len(p.s) {
				return nil, errors.New("unexpected end")
			}
			if p.s[p.i] == ',' {
				p.i++
				continue
			}
			if p.s[p.i] == ']' {
				p.i++
				return arr, nil
			}
			return nil, errors.New("expected , or ]")
		}
	case c == '"':
		return p.str()
	case c == 't' && strings.HasPrefix(p.s[p.i:], "true"):
		p.i += 4
		return true, nil
	case c == 'f' && strings.HasPrefix(p.s[p.i:], "false"):
		p.i += 5
		return false, nil
	case c == 'n' && strings.HasPrefix(p.s[p.i:], "null"):
		p.i += 4
		return nil, nil
	case c == '-' || (c >= '0' && c <= '9'):
		return p.num()
	}
	return nil, errors.New("unexpected character")
}

func (p *parser) num() (Val, error) {
	st := p.i
	if p.s[p.i] == '-' {
		p.i++
	}
	if p.i >= len(p.s) {
		return nil, errors.New("bad number")
	}
	if p.s[p.i] == '0' {
		p.i++
	} else if p.s[p.i] >= '1' && p.s[p.i] <= '9' {
		for p.i < len(p.s) && p.s[p.i] >= '0' && p.s[p.i] <= '9' {
			p.i++
		}
	} else {
		return nil, errors.New("bad number")
	}
	if p.i < len(p.s) && p.s[p.i] == '.' {
		p.i++
		d := 0
		for p.i < len(p.s) && p.s[p.i] >= '0' && p.s[p.i] <= '9' {
			p.i++
			d++
		}
		if d == 0 {
			return nil, errors.New("bad number")
		}
	}
	if p.i < len(p.s) && (p.s[p.i] == 'e' || p.s[p.i] == 'E') {
		p.i++
		if p.i < len(p.s) && (p.s[p.i] == '+' || p.s[p.i] == '-') {
			p.i++
		}
		d := 0
		for p.i < len(p.s) && p.s[p.i] >= '0' && p.s[p.i] <= '9' {
			p.i++
			d++
		}
		if d == 0 {
			return nil, errors.New("bad number")
		}
	}
	raw := p.s[st:p.i]
	f, err := strconv.ParseFloat(raw, 64)
	if err != nil && !math.IsInf(f, 0) {
		return nil, err
	}
	return Num{F: f, Raw: raw}, nil
}

func hex4(s string) (rune, bool) {
	if len(s) < 4 {
		return 0, false
	}
	n, err := strconv.ParseUint(s[:4], 16, 32)
	if err != nil {
		return 0, false
	}
	return rune(n), true
}

func (p *parser) str() (string, error) {
	p.i++ // opening quote
	var b strings.Builder
	for {
		if p.i >= len(p.s) {
			return "", errors.New("unterminated string")
		}
		c := p.s[p.i]
		switch {
		case c == '"':
			p.i++
			return b.String(), nil
		case c < 0x20:
			return "", errors.New("control character in string")
		case c == '\\':
			p.i++
			if p.i >= len(p.s) {
				return "", errors.New("bad escape")
			}
			e := p.s[p.i]
			p.i++
			switch e {
			case '"', '\\', '/':
				b.WriteByte(e)
			case 'b':
				b.WriteByte('\b')
			case 'f':
				b.WriteByte('\f')
			case 'n':
				b.WriteByte('\n')
			case 'r':
				b.WriteByte('\r')
			case 't':
				b.WriteByte('\t')
			case 'u':
				r, ok := hex4(p.s[p.i:])
				if !ok {
					return "", errors.New("bad unicode escape")
				}
				p.i += 4
				if r >= 0xD800 && r < 0xDC00 && strings.HasPrefix(p.s[p.i:], "\\u") {
					if r2, ok := hex4(p.s[p.i+2:]); ok && r2 >= 0xDC00 && r2 < 0xE000 {
						r = 0x10000 + (r-0xD800)<<10 + (r2 - 0xDC00)
						p.i += 6
					}
				}
				if r >= 0xD800 && r < 0xE000 {
					r = utf8.RuneError
				}
				b.WriteRune(r)
			default:
				return "", errors.New("bad escape")
			}
		default:
			b.WriteByte(c)
			p.i++
		}
	}
}

// ---- JavaScript-style output ----

// JSNumber prints f the way JavaScript's Number.prototype.toString does.
func JSNumber(f float64) string {
	if f == 0 {
		return "0"
	}
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "null"
	}
	neg := f < 0
	if neg {
		f = -f
	}
	e := strconv.FormatFloat(f, 'e', -1, 64) // d.ddde±XX
	mant, exps, _ := strings.Cut(e, "e")
	exp, _ := strconv.Atoi(exps)
	digits := strings.Replace(mant, ".", "", 1)
	k := len(digits)
	n := exp + 1
	var out string
	switch {
	case k <= n && n <= 21:
		out = digits + strings.Repeat("0", n-k)
	case 0 < n && n <= 21:
		out = digits[:n] + "." + digits[n:]
	case -6 < n && n <= 0:
		out = "0." + strings.Repeat("0", -n) + digits
	default:
		ee := n - 1
		sign := "+"
		if ee < 0 {
			sign = "-"
			ee = -ee
		}
		if k == 1 {
			out = digits + "e" + sign + strconv.Itoa(ee)
		} else {
			out = digits[:1] + "." + digits[1:] + "e" + sign + strconv.Itoa(ee)
		}
	}
	if neg {
		out = "-" + out
	}
	return out
}

func writeJSString(b *strings.Builder, s string) {
	const hexd = "0123456789abcdef"
	b.WriteByte('"')
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == '"':
			b.WriteString(`\"`)
		case c == '\\':
			b.WriteString(`\\`)
		case c == '\b':
			b.WriteString(`\b`)
		case c == '\f':
			b.WriteString(`\f`)
		case c == '\n':
			b.WriteString(`\n`)
		case c == '\r':
			b.WriteString(`\r`)
		case c == '\t':
			b.WriteString(`\t`)
		case c < 0x20:
			b.WriteString(`\u00`)
			b.WriteByte(hexd[c>>4])
			b.WriteByte(hexd[c&15])
		default:
			b.WriteByte(c)
		}
	}
	b.WriteByte('"')
}

func isArrayIndex(k string) (uint64, bool) {
	if k == "" || len(k) > 10 {
		return 0, false
	}
	if k[0] == '0' && len(k) > 1 {
		return 0, false
	}
	for i := 0; i < len(k); i++ {
		if k[i] < '0' || k[i] > '9' {
			return 0, false
		}
	}
	n, _ := strconv.ParseUint(k, 10, 64)
	if n >= 4294967295 {
		return 0, false
	}
	return n, true
}

// JSOrder returns the keys in JavaScript's property order.
func JSOrder(keys []string) []string {
	var idx []string
	var rest []string
	for _, k := range keys {
		if _, ok := isArrayIndex(k); ok {
			idx = append(idx, k)
		} else {
			rest = append(rest, k)
		}
	}
	sort.SliceStable(idx, func(a, b int) bool {
		x, _ := isArrayIndex(idx[a])
		y, _ := isArrayIndex(idx[b])
		return x < y
	})
	return append(idx, rest...)
}

// Stringify is JSON.stringify(v, null, indent) for indent>0, compact for indent==0.
func Stringify(v Val, indent int) string {
	var b strings.Builder
	stringify(&b, v, indent, 0)
	return b.String()
}

func stringify(b *strings.Builder, v Val, indent, level int) {
	nl := func(l int) {
		if indent > 0 {
			b.WriteByte('\n')
			b.WriteString(strings.Repeat(" ", indent*l))
		}
	}
	switch x := v.(type) {
	case nil:
		b.WriteString("null")
	case bool:
		if x {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
	case string:
		writeJSString(b, x)
	case Num:
		b.WriteString(JSNumber(x.F))
	case []Val:
		if len(x) == 0 {
			b.WriteString("[]")
			return
		}
		b.WriteByte('[')
		for i, e := range x {
			if i > 0 {
				b.WriteByte(',')
			}
			nl(level + 1)
			stringify(b, e, indent, level+1)
		}
		nl(level)
		b.WriteByte(']')
	case *Obj:
		if len(x.Keys) == 0 {
			b.WriteString("{}")
			return
		}
		b.WriteByte('{')
		for i, k := range JSOrder(x.Keys) {
			if i > 0 {
				b.WriteByte(',')
			}
			nl(level + 1)
			writeJSString(b, k)
			b.WriteByte(':')
			if indent > 0 {
				b.WriteByte(' ')
			}
			stringify(b, x.M[k], indent, level+1)
		}
		nl(level)
		b.WriteByte('}')
	}
}

// Raw is compact JSON that keeps number tokens as written and object order.
func Raw(v Val) string {
	var b strings.Builder
	rawWrite(&b, v)
	return b.String()
}

func rawWrite(b *strings.Builder, v Val) {
	switch x := v.(type) {
	case Num:
		b.WriteString(x.Raw)
	case []Val:
		b.WriteByte('[')
		for i, e := range x {
			if i > 0 {
				b.WriteByte(',')
			}
			rawWrite(b, e)
		}
		b.WriteByte(']')
	case *Obj:
		b.WriteByte('{')
		for i, k := range x.Keys {
			if i > 0 {
				b.WriteByte(',')
			}
			writeJSString(b, k)
			b.WriteByte(':')
			rawWrite(b, x.M[k])
		}
		b.WriteByte('}')
	default:
		stringify(b, v, 0, 0)
	}
}

// Equal compares two values by value (objects ignore key order, numbers compare as doubles).
func Equal(a, b Val) bool {
	switch x := a.(type) {
	case nil:
		return b == nil
	case bool:
		y, ok := b.(bool)
		return ok && x == y
	case string:
		y, ok := b.(string)
		return ok && x == y
	case Num:
		y, ok := b.(Num)
		return ok && x.F == y.F
	case []Val:
		y, ok := b.([]Val)
		if !ok || len(x) != len(y) {
			return false
		}
		for i := range x {
			if !Equal(x[i], y[i]) {
				return false
			}
		}
		return true
	case *Obj:
		y, ok := b.(*Obj)
		if !ok || len(x.Keys) != len(y.Keys) {
			return false
		}
		for k, v := range x.M {
			w, ok := y.M[k]
			if !ok || !Equal(v, w) {
				return false
			}
		}
		return true
	}
	return false
}

// ---- line protocol ----

// Serve runs the one-JSON-value-per-line protocol. The handler gets a request line and returns
// the output (marshalled with encoding/json unless it is a json.RawMessage) or an error.
func Serve(handler func(line []byte) (interface{}, error)) {
	rd := bufio.NewReaderSize(os.Stdin, 1<<20)
	out := bufio.NewWriterSize(os.Stdout, 1<<20)
	defer out.Flush()
	for {
		line, err := rd.ReadBytes('\n')
		if len(bytes.TrimSpace(line)) > 0 {
			reply(out, handler, line)
			out.Flush()
		}
		if err != nil {
			if err != io.EOF {
				fmt.Fprintln(os.Stderr, err)
			}
			return
		}
	}
}

func reply(out *bufio.Writer, handler func([]byte) (interface{}, error), line []byte) {
	var res interface{}
	var err error
	func() {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("internal error: %v", r)
			}
		}()
		res, err = handler(line)
	}()
	if err != nil {
		typ := "RuntimeError"
		var ve *ValueError
		if errors.As(err, &ve) {
			typ = "ValueError"
		}
		b, _ := marshal(map[string]interface{}{"error": map[string]string{"type": typ, "message": err.Error()}})
		out.Write(b)
		out.WriteByte('\n')
		return
	}
	var ob []byte
	if rm, ok := res.(json.RawMessage); ok {
		ob = rm
	} else {
		ob, err = marshal(res)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
	}
	out.WriteString(`{"output":`)
	out.Write(ob)
	out.WriteString("}\n")
}

func marshal(v interface{}) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}
