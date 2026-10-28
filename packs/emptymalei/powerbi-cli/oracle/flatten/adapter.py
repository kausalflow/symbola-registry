"""Runs the original pbi flatteners as an implementation of emptymalei/flatten."""

import json
import sys

from pbi_cli.powerbi.admin import Workspaces as AdminWorkspaces
from pbi_cli.powerbi.app import App
from pbi_cli.powerbi.workspace import Workspaces


def run(data):
    kind = data["kind"]
    if kind == "workspaces":
        return {"sheets": AdminWorkspaces(auth={}).flatten_workspaces(data["data"])}
    if kind == "app":
        return {"sheets": App.flatten_app(data["data"])}
    if kind == "report_users":
        args = {} if data.get("key") is None else {"report_users_key": data["key"]}
        return {"sheets": Workspaces.flatten_workspaces_reports_users(data["data"], **args)}
    raise ValueError(kind)


if __name__ == "__main__":
    for line in sys.stdin:
        try:
            reply = {"output": run(json.loads(line))}
        except Exception as e:
            reply = {"error": {"type": type(e).__name__, "message": str(e)}}
        print(json.dumps(reply), flush=True)
