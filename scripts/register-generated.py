"""Register a reviewed, newly generated image for a pending catalog title.

This keeps local additions separate from the supplied Drive-backed manifest.
The importer reads generated_catalog.json alongside that manifest.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "Filipino Food Image Catalog" / "images"
MANIFEST = ROOT / "Filipino Food Image Catalog" / "filipino_food_manifest.json"
GENERATED = WEB / "src" / "data" / "generated_catalog.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--id", help="Pending phfood ID in the supplied manifest")
    parser.add_argument("--new-title", help="Reviewed new title absent from the supplied manifest")
    parser.add_argument("--source", required=True, type=Path, help="Reviewed imagegen PNG")
    parser.add_argument("--prompt", required=True, help="Generation prompt or concise faithful summary")
    parser.add_argument("--qa", required=True, help="Visual review note")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if bool(args.id) == bool(args.new_title):
        raise ValueError("Supply either --id or --new-title")
    if args.id:
        item = next((item for item in manifest["items"] if item["id"] == args.id), None)
        if item is None or item["image_status"] != "pending":
            raise ValueError("ID must be a pending item in the supplied manifest")
        image_id = args.id
    else:
        title = args.new_title.strip()
        if not title or any(record["title"].casefold() == title.casefold() for record in manifest["items"]):
            raise ValueError("New title is empty or already present in manifest")
        image_id = "phfood_" + hashlib.sha1(title.casefold().encode("utf-8")).hexdigest()[:12]
        item = {"title": title}
    if not args.source.is_file():
        raise FileNotFoundError(args.source)
    with Image.open(args.source) as image:
        image.verify()
    with Image.open(args.source) as image:
        width, height = image.size
    if width <= height:
        raise ValueError("Catalog images must be landscape")

    records = json.loads(GENERATED.read_text(encoding="utf-8")) if GENERATED.exists() else []
    if any(record["id"] == image_id or record["title"].casefold() == item["title"].casefold() for record in records):
        raise ValueError("ID is already registered")
    slug = re.sub(r"[^a-z0-9]+", "-", item["title"].lower()).strip("-")
    filename = f"{image_id}__{slug}.png"
    target = IMAGES / filename
    if target.exists():
        raise FileExistsError(target)

    shutil.copy2(args.source, target)
    records.append({
        "id": image_id,
        "title": item["title"],
        "filename": filename,
        "width": width,
        "height": height,
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator": "Codex built-in imagegen",
        "prompt": args.prompt,
        "visual_qa": args.qa,
    })
    GENERATED.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Registered {item['title']}: {target}")


if __name__ == "__main__":
    main()
