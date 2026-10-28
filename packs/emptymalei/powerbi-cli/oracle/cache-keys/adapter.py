"""Runs the original pbi cache code as an implementation of emptymalei/cache-keys."""

import datetime as _dt
import json
import sys
import tempfile
from pathlib import Path

from slugify import slugify

import pbi_cli.cache as cache_module
from pbi_cli.cache import CacheManager


class _FrozenDatetime(_dt.datetime):
    frozen = None

    @classmethod
    def now(cls, tz=None):
        return cls.frozen


def key_op(data):
    # The three commands build their cache key and request metadata inline; these are the same expressions.
    command = data["command"]
    if command == "workspaces list":
        expand = data.get("expand") or []
        return {"cache_key": "workspaces", "metadata": {"top": data["top"], "expand": [*expand], "filter": data.get("odata_filter")}}
    if command == "apps list":
        return {"cache_key": f"apps_{data['role']}", "metadata": {"role": data["role"]}}
    if command == "users user-access":
        return {"cache_key": f"user_access_{slugify(data['user_id'])}", "metadata": {"user_id": data["user_id"]}}
    raise ValueError(command)


def entry_op(data):
    _FrozenDatetime.frozen = _dt.datetime.fromisoformat(data["now"])
    cache_module.datetime = _FrozenDatetime
    with tempfile.TemporaryDirectory() as tmp:
        version = CacheManager(cache_folder=tmp).save(data["cache_key"], data["data"], metadata=data.get("metadata"))
        files = sorted(p for p in Path(tmp).rglob("*") if p.is_file())
        return {
            "version": version,
            "paths": [p.relative_to(tmp).as_posix() for p in files],
            "document": json.loads(files[0].read_text(encoding="utf-8")),
        }


def index_op(data):
    with tempfile.TemporaryDirectory() as tmp:
        for rel in data["files"]:
            path = Path(tmp) / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("{}", encoding="utf-8")
        manager = CacheManager(cache_folder=tmp)
        names = sorted(p.name for p in Path(tmp).iterdir() if p.is_dir())
        versions = {name: manager.list_versions(name) for name in names}
        return {
            "keys": manager.list_keys(),
            "versions": versions,
            "latest": {name: (v[0] if v else None) for name, v in versions.items()},
        }


def run(data):
    return {"key": key_op, "entry": entry_op, "index": index_op}[data["op"]](data)


if __name__ == "__main__":
    for line in sys.stdin:
        try:
            reply = {"output": run(json.loads(line))}
        except Exception as e:
            reply = {"error": {"type": type(e).__name__, "message": str(e)}}
        print(json.dumps(reply), flush=True)
