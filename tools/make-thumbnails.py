#!/usr/bin/env python3
"""Generate base64-encoded thumbnails for the Vugg Simulator inventory."""
import base64, json, sys
from pathlib import Path
from PIL import Image
from io import BytesIO

PHOTOS_DIR = Path(__file__).parent.parent / "photos" / "source"
OUT_DIR = Path(__file__).parent.parent / "photos" / "thumbs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 100  # px, square crop
QUALITY = 70  # JPEG quality

minerals = {
    "calcite": "calcite.jpg",
    "fluorite": "fluorite.jpg",
    "quartz": "quartz.jpg",
    "malachite": "malachite.jpg",
}

b64_map = {}

for mineral, filename in minerals.items():
    src = PHOTOS_DIR / filename
    if not src.exists():
        print(f"  SKIP {mineral} — {src} not found")
        continue
    
    img = Image.open(src)
    
    # Center crop to square
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    
    # Resize to thumbnail
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    
    # Save thumb file
    thumb_path = OUT_DIR / f"{mineral}.jpg"
    img.save(thumb_path, "JPEG", quality=QUALITY)
    
    # Base64 encode
    buf = BytesIO()
    img.save(buf, "JPEG", quality=QUALITY)
    b64 = base64.b64encode(buf.getvalue()).decode()
    b64_map[mineral] = f"data:image/jpeg;base64,{b64}"
    
    fsize = len(buf.getvalue())
    print(f"  ✓ {mineral}: {SIZE}×{SIZE}px, {fsize} bytes, b64 {len(b64)} chars")

# Write JS snippet
js_path = Path(__file__).parent.parent / "photos" / "mineral-thumbs.js"
with open(js_path, "w") as f:
    f.write("// Auto-generated mineral thumbnails\n")
    f.write("const MINERAL_THUMBS = ")
    json.dump(b64_map, f, indent=2)
    f.write(";\n")

print(f"\n  Wrote {js_path}")
print(f"  Total minerals: {len(b64_map)}")
