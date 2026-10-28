"""Helpers for the publish workflow (.github/workflows/publish.yml).

    publish.py build UPLOAD_URL PACK OUT [PUBLISHER]
                                             download the upload, release it into packs/, copy the new version
                                             (and the upload's evidence) to OUT
    publish.py place ARTIFACT PACK           check a built version against main and copy it into packs/
    publish.py profile OWNER CONTENT_B64     write publishers/<owner>.toml after checking it

`build` runs pack code (validation runs its checks), so its job has no secrets. `place`
runs in the job that holds the app token and never runs pack code; it only accepts a
new version folder for PACK, the matching line appended to its digests.txt, and new
attestation files.

An upload may carry evidence from a test build (`symbola publish --evidence`): attestations
and runner keys in `.evidence/`. `build` checks that every attestation verifies and covers
the new version, and names the files so they never replace ones already there.
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
MAX_EVIDENCE = 200
EVIDENCE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(json|pub)$")


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


def build(upload_url: str, pack: str, out: Path, publisher: str = "publisher") -> None:
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
    evidence(spec / ".evidence", pack, r.path, r.version, publisher, out / "attestations")
    shutil.copyfile(Path("packs", pack, "digests.txt"), out / "digests.txt")
    (out / "meta.json").write_text(json.dumps({"pack": pack, "version": r.version, "digest": r.digest}))
    print(f"{pack} version {r.version} built ({r.digest})")


def evidence(src: Path, pack: str, version_dir: Path, n: int, publisher: str, out: Path) -> None:
    """Check the upload's attestations against the new version and copy them, renamed, to out."""
    from symbola.registry import pack_evidence

    if not src.is_dir():
        return
    files = [p for p in src.iterdir()]
    if len(files) > MAX_EVIDENCE:
        fail(f"at most {MAX_EVIDENCE} evidence files")
    for p in files:
        if not p.is_file() or p.is_symlink() or not EVIDENCE_NAME_RE.match(p.name):
            fail(f"evidence: {p.name} is not an attestation (.json) or a runner key (.pub)")
    owner = publisher if OWNER_RE.match(publisher) else "publisher"
    attestations = Path("packs", pack, "attestations")
    taken = {p.name for p in attestations.iterdir()} if attestations.is_dir() else set()
    out.mkdir(parents=True)
    keys = sorted(p for p in files if p.suffix == ".pub")
    for i, p in enumerate(keys, 1):
        name = f"{owner}.pub" if len(keys) == 1 else f"{owner}-{i}.pub"
        if name in taken and (attestations / name).read_bytes() != p.read_bytes():
            name = f"{owner}-v{n}-{i}.pub"
        if name not in taken:
            shutil.copyfile(p, out / name)
    for p in sorted(p for p in files if p.suffix == ".json"):
        name = f"v{n}.{p.name}"
        if name in taken:
            fail(f"evidence: {name} already exists beside the pack")
        shutil.copyfile(p, out / name)
    # Check them as the site will: beside the pack, with the keys already there.
    trial = Path("evidence-check")
    shutil.copytree(Path("packs", pack), trial / "pack")
    shutil.copytree(out, trial / "pack" / "attestations", dirs_exist_ok=True)
    report = pack_evidence(trial / "pack", trial / "pack" / "versions" / str(n))
    ours = {f"attestations/{p.name}" for p in out.glob("*.json")}
    for rec in report["attestations"]:
        if rec["file"] not in ours:
            continue
        if not rec["valid"]:
            fail(f"evidence: {rec['file']}: {'; '.join(rec['problems'])}")
        if rec["covers"] != "latest":
            fail(f"evidence: {rec['file']} attests {rec['contract']}, which is not part of version {n}")
    shutil.rmtree(trial)
    print(f"{len(ours)} attestations from the test build")


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
    evidence = artifact / "attestations"
    if evidence.is_dir():
        target = root / "attestations"
        target.mkdir(exist_ok=True)
        for p in sorted(evidence.iterdir()):
            if not p.is_file() or p.is_symlink() or not EVIDENCE_NAME_RE.match(p.name) or (target / p.name).exists():
                fail(f"the built evidence has an unexpected file: {p.name}")
            shutil.copyfile(p, target / p.name)
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
    {"build": lambda u, p, o, *who: build(u, p, Path(o), *who), "place": lambda a, p: place(Path(a), p),
     "profile": profile}[cmd](*args)
