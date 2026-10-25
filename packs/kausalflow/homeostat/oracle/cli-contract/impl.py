"""Oracle for cli-contract: the original `homeostat` command, run in a scratch directory."""

import contextlib
import io
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from homeostat.ai.cli import main

_CODE = re.compile(r"\[([EW]_[A-Z_]+)\]")


def run(input):
    with tempfile.TemporaryDirectory() as tmp:
        for name, text in input["files"].items():
            path = Path(tmp) / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        out, err = io.StringIO(), io.StringIO()
        old_cwd, old_stdin = os.getcwd(), sys.stdin
        os.chdir(tmp)
        sys.stdin = io.StringIO(input.get("stdin") or "")
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                try:
                    code = main(input["argv"])
                except SystemExit as exc:
                    code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 2)
            written = sorted(
                str(p.relative_to(tmp)) for p in Path(tmp).rglob("*") if p.is_file() and str(p.relative_to(tmp)) not in input["files"]
            )
        finally:
            os.chdir(old_cwd)
            sys.stdin = old_stdin
    text = out.getvalue()
    parsed = None
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
        codes = _CODE.findall(err.getvalue() + text)
    command = next((a for a in input["argv"] if not a.startswith("-")), None)
    lines = text.splitlines()
    return {
        "exit_code": int(code),
        "stdout_kind": kind,
        "json_keys": sorted(parsed) if parsed else None,
        "ok": parsed.get("ok") if parsed else None,
        "codes": codes,
        "file": parsed.get("file") if parsed else None,
        "summary": parsed.get("summary") if parsed else None,
        "checks": [{"id": c["id"], "status": c["status"]} for c in parsed["checks"]] if parsed and isinstance(parsed.get("checks"), list) else None,
        "files_written": written,
        "headline": lines[0] if (command == "validate" and kind == "text" and lines) else None,
        "stderr_has_issues": bool(_CODE.search(err.getvalue())),
    }
