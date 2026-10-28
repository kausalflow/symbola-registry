"""Runs the original scan-batch workspace entry normalisation as an implementation of emptymalei/workspace-entries."""

import json
import sys

import click
from slugify import slugify

from pbi_cli.cli import _normalize_workspace_entries


def run(data):
    try:
        entries = _normalize_workspace_entries(data["workspace_ids"])
    except click.ClickException as e:
        raise ValueError(e.format_message()) from e
    out = []
    for entry in entries:
        workspace_id, workspace_name = entry["id"], entry.get("name")
        # scan_batch builds the label and the file name inline; these are the same expressions.
        label = f"{workspace_name} ({workspace_id})" if workspace_name else workspace_id
        name_slug = slugify(workspace_name) if workspace_name else ""
        file_stub = f"{name_slug}-{workspace_id}" if name_slug else workspace_id
        out.append({"id": workspace_id, "name": workspace_name, "label": label, "file_stem": file_stub})
    return {"entries": out}


if __name__ == "__main__":
    for line in sys.stdin:
        try:
            reply = {"output": run(json.loads(line))}
        except Exception as e:
            reply = {"error": {"type": type(e).__name__, "message": str(e)}}
        print(json.dumps(reply), flush=True)
