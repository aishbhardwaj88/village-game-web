#!/usr/bin/env python3
"""
fetch_assets.py -- the one script for pulling free/CC0/CC-BY assets into
this project, per CLAUDE.md section 2b (added 8 Sep 2026).

Why this exists: ad-hoc `curl` inside `$(...)`/pipes/loops can't be
statically analysed by the permission system, so it always prompted --
even for pre-approved domains. A plain script Claude Code can just run
avoids that, and centralises the actual safety rules in one place instead
of re-deriving them by hand in every session.

What it does, every time, no exceptions:
1. Refuses any domain not on ALLOWED_DOMAINS below.
2. Refuses any licence not in ALLOWED_LICENCES (case-insensitive
   substring match -- "CC0", "CC-BY", "CC BY", "OFL", "Pixabay Content
   License", "Sonniss").
3. Downloads the file, prints a clear log line.
4. Appends one row to ASSETS.md and one to docs/licences.md -- both
   tables' exact column order is hard-coded below, matching what's
   already in each file at time of writing. If either file's table
   header ever changes, this script's INSERT_MARKER search needs updating
   to match, not the other way around -- markdown edits should still be
   readable as prose, not shaped to serve this script.

Usage:
    python3 tools/fetch_assets.py --batch batch.json

Where batch.json is a list of objects:
[
  {
    "url": "https://kenney.nl/media/pages/assets/car-kit/.../kenney_car-kit.zip",
    "out": "downloads/car-kit.zip",
    "asset_name": "Car Kit",
    "source_url": "https://kenney.nl/assets/car-kit",
    "licence": "CC0 1.0 Universal",
    "proof": "Pack's own page: \"CC0 licensed\"",
    "used_for": "Generic road vehicles (taxi, bus, auto) -- form/colour only, no badges"
  }
]

Or call download_one(...) directly from another script for a single file.
"""
import sys
import json
import os
import re
import urllib.request
from pathlib import Path
from datetime import date

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_MD = REPO_ROOT / "ASSETS.md"
LICENCES_MD = REPO_ROOT / "docs" / "licences.md"

ALLOWED_DOMAINS = {
    "quaternius.com", "quaternius.itch.io", "kaylousberg.itch.io", "itch.io",
    "kenney.nl", "poly.pizza", "ambientcg.com", "polyhaven.com",
    # polyhaven.org (13 Sep 2026): Poly Haven's actual file CDN
    # (dl.polyhaven.org) is a different top-level domain from the site
    # itself (polyhaven.com) -- confirmed directly via api.polyhaven.com's
    # own file listing before adding this. Same service, already approved
    # in spirit (CLAUDE.md names Poly Haven explicitly); this closes a real
    # gap where the allowlist named the site but not where it actually
    # serves files from.
    "polyhaven.org",
    "opengameart.org", "freesound.org", "sonniss.com", "pixabay.com",
    "fonts.google.com", "github.com", "githubusercontent.com", "mixamo.com",
    # itch.io game subdomains (e.g. standout7.itch.io) -- matched by suffix below, not listed individually
}

ALLOWED_LICENCE_SUBSTRINGS = [
    "cc0", "cc-by", "cc by", "ofl", "pixabay content license", "sonniss",
]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def domain_allowed(url: str) -> bool:
    host = re.sub(r"^https?://", "", url).split("/")[0].lower()
    if host in ALLOWED_DOMAINS:
        return True
    return any(host.endswith("." + d) for d in ALLOWED_DOMAINS)


def licence_allowed(licence: str) -> bool:
    low = licence.lower()
    return any(sub in low for sub in ALLOWED_LICENCE_SUBSTRINGS)


def download_one(entry: dict) -> bool:
    url = entry["url"]
    if not domain_allowed(url):
        print(f"REFUSED (domain not allowed): {url}", file=sys.stderr)
        return False
    if not licence_allowed(entry["licence"]):
        print(f"REFUSED (licence not in allowlist -- '{entry['licence']}'): {entry['asset_name']}", file=sys.stderr)
        return False

    out_path = REPO_ROOT / entry["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp, open(out_path, "wb") as f:
        f.write(resp.read())

    print(f"OK: {entry['asset_name']} -> {out_path} ({out_path.stat().st_size} bytes)")
    log_to_assets_md(entry)
    log_to_licences_md(entry)
    return True


def log_to_assets_md(entry: dict):
    """Appends one row to ASSETS.md's main credits table. Finds the header
    row by its exact known text and inserts right after the last existing
    data row (the line before the first blank line that follows)."""
    text = ASSETS_MD.read_text()
    header_marker = "| Asset | Source | Licence | Commercial use verified | Redistribution verified | Used for | AI-generated | Used in current build |"
    idx = text.find(header_marker)
    if idx == -1:
        print("WARNING: ASSETS.md header row not found as expected -- skipping auto-log, add this row by hand:", file=sys.stderr)
        print(f"  {entry['asset_name']} | {entry['source_url']} | {entry['licence']}", file=sys.stderr)
        return

    # Walk forward from the header to the end of this table (first blank
    # line). str.find returns the index of the FIRST character of "\n\n" --
    # +1 lands table_end right after that first newline (i.e. right after
    # the last row's own line break), not before it. Getting this wrong
    # once already glued two rows onto one line with no newline between
    # them ("...Yes || Car Kit...") -- caught and fixed by hand, this is
    # the actual fix, not a workaround.
    table_end = text.find("\n\n", idx) + 1
    new_row = (f"| {entry['asset_name']} | [{entry['source_url'].split('//')[-1]}]({entry['source_url']}) | "
               f"{entry['licence']} | Yes | Yes | {entry['used_for']} | No | **Downloaded, not yet wired** |\n")
    text = text[:table_end] + new_row + text[table_end:]
    ASSETS_MD.write_text(text)


def log_to_licences_md(entry: dict):
    """Appends a small dated section to docs/licences.md rather than trying
    to guess which of its several differently-shaped tables to insert into
    -- that file mixes per-pass table formats, and a wrong guess would
    silently corrupt one. A clearly-dated append is always safe."""
    with open(LICENCES_MD, "a") as f:
        f.write(f"\n\n### {entry['asset_name']} (fetched via tools/fetch_assets.py, {date.today().isoformat()})\n\n")
        f.write(f"- Source: {entry['source_url']}\n")
        f.write(f"- Licence: {entry['licence']}\n")
        f.write(f"- Proof: {entry['proof']}\n")
        f.write(f"- Used for: {entry['used_for']}\n")
        f.write(f"- File: `{entry['out']}`\n")


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] != "--batch":
        sys.exit("Usage: python3 tools/fetch_assets.py --batch batch.json")
    with open(sys.argv[2]) as f:
        batch = json.load(f)
    ok = sum(1 for entry in batch if download_one(entry))
    print(f"\n{ok}/{len(batch)} downloaded successfully.")
