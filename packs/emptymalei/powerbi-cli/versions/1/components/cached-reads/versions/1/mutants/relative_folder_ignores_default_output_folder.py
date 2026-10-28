"""A relative target folder is always under the current directory."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    files = dict(input.get("files") or {})
    config = files.get(".pbi_cli/config.yaml", "")
    files[".pbi_cli/config.yaml"] = "\n".join(l for l in config.splitlines() if not l.startswith("default_output_folder")) + "\n"
    return original({**input, "files": files})
