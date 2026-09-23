#!/usr/bin/env python3
"""Locate a Flashpoint game's GameZIP inside the archive.org mirror.

Flashpoint's own CDN grants CORS to its own player and nobody else, but the
whole collection is mirrored on archive.org as a set of very large .zip files,
and archive.org will extract a single file from inside a zip. This finds which
part holds a given game and prints the `fileFlashpointArchiveZip` block for games.json.

    python3 tools/find-flashpoint-zip.py <flashpoint-uuid>

How it searches: it reads each part's real ZIP central directory over HTTP
range requests (~1 MB per part) rather than scraping the HTML listing, and
caches the parsed file lists locally. The entries are NOT sorted by UUID, so
every part has to be checked — hence the cache. First run costs ~30 MB and a
few minutes; later lookups are instant.

Coverage is not guaranteed: the mirror is a snapshot, so a game can be missing.
"""

import json
import os
import re
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request

# The mirror is split across two items: the first holds parts 1-5 and 10-25,
# the second the missing 6-9. Together they are complete.
ITEMS = ["Flashpoint13.0", "Flashpoint13.0_part2"]
UA = {"User-Agent": "flashback-arcade/1.0 (game sourcing)"}
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".fp-index")


def get(url, timeout=120, headers=None):
    h = dict(UA)
    if headers:
        h.update(headers)
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout)


def game_meta(uuid):
    url = "https://db-api.unstable.life/search?" + urllib.parse.urlencode({"id": uuid})
    rows = json.load(get(url, 30))
    return rows[0] if rows else None


def parts():
    """Every GameData_*.zip across both items, as (item, zipname)."""
    out = []
    for item in ITEMS:
        meta = json.load(get(f"https://archive.org/metadata/{item}", 60))
        for f in meta.get("files", []):
            if re.fullmatch(r"GameData_\d+\.zip", f["name"]):
                out.append((item, f["name"]))
    return sorted(out, key=lambda p: int(re.search(r"\d+", p[1]).group()))


def storage_node(item, name):
    """/download/ redirects to a node that honours Range; /cors/ does not."""
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(f"https://archive.org/download/{item}/{name}", headers=UA)
    try:
        opener.open(req, timeout=60)
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 307, 308):
            return e.headers["Location"]
    return None


def byte_range(url, start, end):
    with get(url, 180, {"Range": f"bytes={start}-{end}"}) as r:
        return r.read(), int(r.headers.get("Content-Range", "/0").split("/")[-1])


def zip_names(url):
    """Read a (ZIP64) central directory and return every stored path."""
    _, total = byte_range(url, 0, 0)
    tail, _ = byte_range(url, max(0, total - 65557), total - 1)

    i = tail.rfind(b"PK\x06\x06")  # ZIP64 end-of-central-directory record
    if i >= 0:
        size = struct.unpack("<Q", tail[i + 40:i + 48])[0]
        off = struct.unpack("<Q", tail[i + 48:i + 56])[0]
    else:
        j = tail.rfind(b"PK\x05\x06")
        if j < 0:
            raise RuntimeError("no end-of-central-directory found")
        size = struct.unpack("<I", tail[j + 12:j + 16])[0]
        off = struct.unpack("<I", tail[j + 16:j + 20])[0]

    cd, _ = byte_range(url, off, off + size - 1)
    names, p = [], 0
    while p + 46 <= len(cd) and cd[p:p + 4] == b"PK\x01\x02":
        nlen = struct.unpack("<H", cd[p + 28:p + 30])[0]
        elen = struct.unpack("<H", cd[p + 30:p + 32])[0]
        clen = struct.unpack("<H", cd[p + 32:p + 34])[0]
        names.append(cd[p + 46:p + 46 + nlen].decode("utf-8", "replace"))
        p += 46 + nlen + elen + clen
    return names


def cached_names(item, name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{item}__{name}.txt")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path, encoding="utf-8") as fh:
            return fh.read().splitlines()
    node = storage_node(item, name)
    if not node:
        return []
    names = zip_names(node)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(names))
    return names


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    uuid = sys.argv[1].strip().lower()

    meta = game_meta(uuid)
    if meta:
        print(f"  {meta.get('title')}  [{meta.get('platform')}, {meta.get('status')}]",
              file=sys.stderr)
    launch = (meta or {}).get("launchCommand") or ""

    all_parts = parts()
    print(f"  searching {len(all_parts)} parts across {len(ITEMS)} items "
          f"(cache: {CACHE})", file=sys.stderr)

    for item, name in all_parts:
        names = cached_names(item, name)
        hit = [n for n in names if uuid in n]
        print(f"  {name:<16} {len(names):>6} entries{'  <-- FOUND' if hit else ''}",
              file=sys.stderr)
        if hit:
            snippet = {"item": item, "zip": name, "path": hit[0]}
            if launch:
                # The GameZIP mirrors the original host and path under content/.
                snippet["entry"] = "content/" + re.sub(r"^\w+://", "", launch)
            print(json.dumps({"fileFlashpointArchiveZip": snippet}, indent=2, ensure_ascii=False))
            return 0

    print("NOT FOUND in the mirror (a snapshot — coverage is not guaranteed).")
    return 2


if __name__ == "__main__":
    sys.exit(main())
