"""Helpers for the publish workflow (.github/workflows/publish.yml).

    publish.py build UPLOAD_URL PACK OUT     download the upload, release it into packs/, copy the new version to OUT
    publish.py place ARTIFACT PACK           check a built version against main and copy it into packs/
    publish.py profile OWNER CONTENT_B64     write publishers/<owner>.toml after checking it

`build` runs pack code (validation runs its checks), so its job has no secrets. `place`
runs in the job that holds the app token and never runs pack code; it only accepts a
new version folder for PACK and the matching line appended to its digests.txt.
"""

import base64
import io
import json
import re
import shutil
import sys
import tarfile
import tomllib
import urllib.request
import zipfile
from pathlib import Path

PACK_RE = re.compile(r"^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$")
OWNER_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
MAX_BYTES = 5 * 1024 * 1024
MAX_FILES = 2000


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    out = Path("publish-error.txt")
    out.write_text(message + "\n")
    sys.exit(1)


def unpack(data: bytes, dest: Path) -> Path:
    """Unpack a .tar.gz or .zip without leaving dest; return the folder holding symbolon-pack.toml."""
    dest.mkdir(parents=True)
    if data[:2] == b"\x1f\x8b":
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            members = [m for m in tar.getmembers() if m.isfile() or m.isdir()]
            if len(members) > MAX_FILES:
                fail(f"the archive has more than {MAX_FILES} files")
            tar.extractall(dest, members=members, filter="data")
    elif data[:4] == b"PK\x03\x04":
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names = z.namelist()
            if len(names) > MAX_FILES:
                fail(f"the archive has more than {MAX_FILES} files")
            for name in names:
                target = (dest / name).resolve()
                if not target.is_relative_to(dest.resolve()):
                    fail(f"the archive has a path outside the pack: {name}")
            z.extractall(dest)
    else:
        fail("the upload is neither a .tar.gz nor a .zip")
    for root in (dest, *[p for p in dest.iterdir() if p.is_dir()]):
        if (root / "symbolon-pack.toml").is_file():
            return root
    fail("no symbolon-pack.toml at the top of the archive (or one folder down)")


def build(upload_url: str, pack: str, out: Path) -> None:
    from symbola.registry import RegistryError, release

    if not PACK_RE.match(pack):
        fail(f"bad pack id {pack!r}")
    try:
        with urllib.request.urlopen(upload_url, timeout=60) as r:
            data = r.read(MAX_BYTES + 1)
    except OSError as e:
        fail(f"could not fetch the upload: {e}")
    if len(data) > MAX_BYTES:
        fail("the upload is larger than 5 MB")
    spec = unpack(data, Path("upload"))
    with (spec / "symbolon-pack.toml").open("rb") as f:
        manifest = tomllib.load(f)
    got = manifest.get("pack", manifest).get("id")
    if got != pack:
        fail(f"symbolon-pack.toml says id = {got!r}, but this publish was started for {pack}")
    try:
        r = release(spec, Path("packs"))
    except (RegistryError, FileNotFoundError) as e:
        fail(f"pack validate failed: {e}")
    if not r.created:
        fail(f"{pack} version {r.version} already has exactly this content; nothing to publish")
    out.mkdir(parents=True)
    shutil.copytree(r.path, out / "version")
    shutil.copyfile(Path("packs", pack, "digests.txt"), out / "digests.txt")
    (out / "meta.json").write_text(json.dumps({"pack": pack, "version": r.version, "digest": r.digest}))
    print(f"{pack} version {r.version} built ({r.digest})")


def place(artifact: Path, pack: str) -> None:
    meta = json.loads((artifact / "meta.json").read_text())
    if meta["pack"] != pack:
        fail("the built pack does not match the request")
    n = int(meta["version"])
    root = Path("packs", pack)
    versions = root / "versions"
    current = max((int(p.name) for p in versions.iterdir() if p.name.isdigit()), default=0) if versions.is_dir() else 0
    if n != current + 1:
        fail(f"built version {n}, but main is at version {current}; publish again")
    for p in (artifact / "version").rglob("*"):
        if p.is_symlink():
            fail(f"the built pack contains a symlink: {p}")
    old = (root / "digests.txt").read_text() if (root / "digests.txt").is_file() else ""
    new = (artifact / "digests.txt").read_text()
    added = new[len(old):] if new.startswith(old) else None
    if added is None or not re.fullmatch(rf"{n} \S+\n", added):
        fail("digests.txt may only gain one line, for the new version")
    shutil.copytree(artifact / "version", versions / str(n))
    (root / "digests.txt").write_text(new)
    print(f"placed {pack} version {n}")
    with open("place.out", "w") as f:
        f.write(json.dumps({"version": n, "new_pack": current == 0}))


def https(s: object) -> bool:
    return isinstance(s, str) and re.fullmatch(r"https://[^\s\"<>]+", s) is not None and len(s) <= 300


def profile(owner: str, content_b64: str) -> None:
    if not OWNER_RE.match(owner):
        fail(f"bad owner {owner!r}")
    text = base64.b64decode(content_b64).decode()
    try:
        p = tomllib.loads(text)
    except tomllib.TOMLDecodeError as e:
        fail(f"profile is not valid TOML: {e}")
    if set(p) - {"name", "url", "bio", "support"}:
        fail(f"unknown profile fields: {sorted(set(p) - {'name', 'url', 'bio', 'support'})}")
    if not isinstance(p.get("name"), str) or not 0 < len(p["name"]) <= 80:
        fail("name: 1 to 80 characters")
    if "url" in p and not https(p["url"]):
        fail("url must be an https:// link")
    if "bio" in p and (not isinstance(p["bio"], str) or len(p["bio"]) > 280):
        fail("bio: at most 280 characters")
    support = p.get("support", [])
    if not isinstance(support, list) or len(support) > 5:
        fail("at most 5 support links")
    for link in support:
        if not isinstance(link, dict) or not isinstance(link.get("label"), str) or not 0 < len(link["label"]) <= 40 \
                or not https(link.get("url")):
            fail("each support link needs a label (at most 40 characters) and an https:// url")
    Path("publishers").mkdir(exist_ok=True)
    Path("publishers", f"{owner}.toml").write_text(text)


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    {"build": lambda u, p, o: build(u, p, Path(o)), "place": lambda a, p: place(Path(a), p),
     "profile": profile}[cmd](*args)
