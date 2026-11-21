"""What config-cache compares: a reduction of one `pbi` invocation."""

import json
import re

# The scratch directory the program runs in (and HOME): a random name under a temp folder.
SCRATCH = re.compile(r"[^\s'\"]*/tmp[a-z0-9_]{8}")


def clean(text):
    return "\n".join(line.rstrip() for line in SCRATCH.sub("<scratch>", text).splitlines())


def errors_of(result):
    """Error lines the program prints on standard error. A usage error (exit 2) has click's wording, which is not part of the contract."""
    if result["exit_code"] == 2:
        return []
    return [clean(l) for l in result["stderr"].splitlines() if l.startswith("Error:") or l == "Aborted!"]


def _scalar(text):
    text = text.strip()
    if text in ("null", "~", ""):
        return None
    if text in ("true", "false"):
        return text == "true"
    if text in ("{}", "[]"):
        return {} if text == "{}" else []
    if text[0] == "'" and text[-1] == "'" and len(text) > 1:
        return text[1:-1].replace("''", "'")
    if text[0] == '"' and text[-1] == '"' and len(text) > 1:
        return json.loads(text)
    for cast in (int, float):
        try:
            return cast(text)
        except ValueError:
            pass
    return text


def _block(lines, i, indent):
    out = {}
    while i < len(lines) and lines[i][0] == indent:
        key, _, rest = lines[i][1].partition(":")
        key = _scalar(key)
        i += 1
        if rest.strip():
            out[key] = _scalar(rest)
        elif i < len(lines) and lines[i][0] > indent:
            out[key], i = _block(lines, i, lines[i][0])
        else:
            out[key] = None
    if i < len(lines) and lines[i][0] > indent:
        raise ValueError("unexpected indent")
    return out, i


def _walk(value):
    if isinstance(value, str):
        return SCRATCH.sub("<scratch>", value)
    if isinstance(value, dict):
        return {k: _walk(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_walk(v) for v in value]
    return value


def parse_file(path, text):
    """JSON and block-style YAML files are reported as parsed values, a workbook as "<xlsx>", anything else as text."""
    if text.startswith("PK"):
        return "<xlsx>"
    try:
        if path.endswith(".json"):
            return _walk(json.loads(text))
        if path.endswith((".yaml", ".yml")):
            lines = [(len(l) - len(l.lstrip(" ")), l.strip()) for l in text.splitlines() if l.strip() and not l.lstrip().startswith("#")]
            return _walk(_block(lines, 0, lines[0][0])[0]) if lines else None
    except ValueError:
        pass
    return clean(text)


def files_of(result):
    return {path: parse_file(path, text) for path, text in sorted(result["files"].items())}


def observe(input, result):
    return {
        "exit_code": result["exit_code"],
        "stdout": clean(result["stdout"]),
        "errors": errors_of(result),
        "files": files_of(result),
    }
