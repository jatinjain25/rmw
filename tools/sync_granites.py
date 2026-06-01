#!/usr/bin/env python3
"""
Sync new granite images into js/colors.js.

Drop image files into assets/granites/ (filename = the granite name, e.g.
"alaska-white.jpg" or "Alaska White.jpg"). Running this script appends any
images not already present to the MARBLE_COLORS array in js/colors.js.

- id          : kebab-case slug derived from the filename
- name        : Title-Case display name derived from the filename
- image       : assets/granites/<filename>
- base/accent : fallback gradient stops sampled from the image (used only if
                the real image fails to load)
- description : "Premium <Name> granite."

Idempotent: images already referenced in colors.js (by id) are skipped.
Prints the ids it added (one per line); prints nothing if there was nothing new.
"""

import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRANITES_DIR = os.path.join(ROOT, "assets", "granites")
COLORS_JS = os.path.join(ROOT, "js", "colors.js")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def slugify(stem: str) -> str:
    s = stem.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def titleize(stem: str) -> str:
    words = re.split(r"[\s_\-]+", stem.strip())
    return " ".join(w[:1].upper() + w[1:] for w in words if w)


def luminance(rgb) -> float:
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def hex_color(rgb) -> str:
    return "#%02x%02x%02x" % (int(rgb[0]), int(rgb[1]), int(rgb[2]))


def sample_colors(path: str):
    """Return (base, accent) hex strings: base = darkest dominant tone,
    accent = a brighter dominant tone, sampled from the image."""
    try:
        img = Image.open(path).convert("RGB")
        img.thumbnail((96, 96))
        pal = img.quantize(colors=6, method=Image.MEDIANCUT).convert("RGB")
        counts = pal.getcolors(96 * 96) or []
        colors = [c for _, c in sorted(counts, key=lambda t: -t[0])]
        if not colors:
            return "#2a2a2a", "#8a8a8a"
        ordered = sorted(colors, key=luminance)
        base = ordered[0]
        accent = ordered[-1] if len(ordered) > 1 else ordered[0]
        return hex_color(base), hex_color(accent)
    except Exception:
        return "#2a2a2a", "#8a8a8a"


def existing_ids(js_text: str):
    return set(re.findall(r"id:\s*'([^']+)'", js_text))


def main():
    if not os.path.isdir(GRANITES_DIR):
        return 0
    with open(COLORS_JS, "r", encoding="utf-8") as f:
        js = f.read()

    have = existing_ids(js)

    files = sorted(
        fn for fn in os.listdir(GRANITES_DIR)
        if not fn.startswith(".") and os.path.splitext(fn)[1].lower() in IMAGE_EXTS
    )

    new_entries = []
    added_ids = []
    for fn in files:
        stem = os.path.splitext(fn)[0]
        cid = slugify(stem)
        if not cid or cid in have:
            continue
        name = titleize(stem)
        base, accent = sample_colors(os.path.join(GRANITES_DIR, fn))
        # forward-slash path for the web, regardless of OS
        web_path = "assets/granites/" + fn
        entry = (
            "  {{ id: '{cid}', name: '{name}', "
            "image: '{path}', base: '{base}', accent: '{accent}', "
            "description: 'Premium {name} granite.' }},"
        ).format(cid=cid, name=name.replace("'", "\\'"),
                 path=web_path, base=base, accent=accent)
        new_entries.append(entry)
        added_ids.append(cid)
        have.add(cid)

    if not new_entries:
        return 0

    # Insert before the closing "];" of the MARBLE_COLORS array.
    marker = "\n];"
    idx = js.rfind(marker)
    if idx == -1:
        sys.stderr.write("Could not find end of MARBLE_COLORS array in colors.js\n")
        return 1
    js = js[:idx] + "\n" + "\n".join(new_entries) + js[idx:]

    with open(COLORS_JS, "w", encoding="utf-8") as f:
        f.write(js)

    print("\n".join(added_ids))
    return 0


if __name__ == "__main__":
    sys.exit(main())
