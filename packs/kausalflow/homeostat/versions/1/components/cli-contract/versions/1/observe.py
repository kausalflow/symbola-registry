"""What cli-contract compares: a reduction of one `homeostat` invocation."""

import json
import re

_CODE = re.compile(r"\[([EW]_[A-Z_]+)\]")


def observe(input, result):
    text, err = result["stdout"], result["stderr"]
    try:
        parsed = json.loads(text) if text.strip() else None
    except ValueError:
        parsed = None
    if isinstance(parsed, dict):
        kind = "json"
        codes = [i["code"] for key in ("errors", "warnings") for i in (parsed.get(key) if isinstance(parsed.get(key), list) else []) if isinstance(i, dict)]
    else:
        kind = "text" if text.strip() else "empty"
        parsed = None
        codes = _CODE.findall(err + text)
    command = next((a for a in input["argv"] if not a.startswith("-")), None)
    lines = text.splitlines()
    return {
        "exit_code": result["exit_code"],
        "stdout_kind": kind,
        "json_keys": sorted(parsed) if parsed else None,
        "ok": parsed.get("ok") if parsed else None,
        "codes": codes,
        "file": parsed.get("file") if parsed else None,
        "summary": parsed.get("summary") if parsed else None,
        "checks": [{"id": c["id"], "status": c["status"]} for c in parsed["checks"]] if parsed and isinstance(parsed.get("checks"), list) else None,
        "files_written": sorted(result["files"]),
        "headline": lines[0] if (command == "validate" and kind == "text" and lines) else None,
        "stderr_has_issues": bool(_CODE.search(err)),
    }
