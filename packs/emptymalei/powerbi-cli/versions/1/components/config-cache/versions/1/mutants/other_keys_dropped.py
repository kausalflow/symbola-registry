"""Changing one setting rewrites the file with only the known keys."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    config = out["files"].get(".pbi_cli/config.yaml")
    if config is not None:
        known = {"active_profile", "profiles", "groups", "default_output_folder", "cache_folder", "cache_enabled", "verify_certificates"}
        out["files"][".pbi_cli/config.yaml"] = {k: v for k, v in config.items() if k in known}
    return out
