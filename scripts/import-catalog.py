"""Build a compact, local image catalog from the supplied food archive.

The original PNGs stay in ../../Filipino Food Image Catalog/images. This script
creates smaller WebP files for the app and metadata consumed by both Next and API.
It is safe to rerun: unchanged WebP files are skipped.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from pathlib import Path
import hashlib
import json
import re
import sys

from PIL import Image, ImageOps

from categorize import category_for

ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Filipino Food Image Catalog" / "images"
OUTPUT = WEB / "public" / "food"
CATALOG = WEB / "src" / "data" / "catalog.json"
RECIPES = WEB / "src" / "data" / "catalog-recipes.json"
DISHES = WEB / "src" / "data" / "dishes.json"
MERIENDA = WEB / "src" / "data" / "merienda.json"
MANIFEST = ROOT / "Filipino Food Image Catalog" / "filipino_food_manifest.json"
GENERATED = WEB / "src" / "data" / "generated_catalog.json"
EXPLICIT_MATCHES = {
    "sarciadong-isda": "phfood_1b3b8144afd6",  # Fish Sarciado
    "ginisang-monggo": "phfood_c1a705db0b4c",  # Ginisang Munggo (Monggo)
    "giniling-guisado": "phfood_693abf4039e7",  # Giniling
    "ginataang-hipon": "phfood_d411e512ed6b",  # Shrimp in coconut milk
    "pritong-manok": "phfood_5ff2362eb92f",  # Filipino Fried Chicken
    "tinapa-with-kamatis": "phfood_3fefede65b2c",  # Tinapa, salted egg, tomato
    "pochero": "phfood_455ac7b3bb36",  # Filipino pork pochero
    "okoy": "phfood_66f724b87020",  # Ukoy
    "adobo-flakes": "phfood_" + hashlib.sha1("Adobo Flakes at Sinangag".casefold().encode()).hexdigest()[:12],
    "ginisang-sardinas": "phfood_" + hashlib.sha1("Ginisang Sardinas".casefold().encode()).hexdigest()[:12],
    "inihaw-na-liempo": "phfood_" + hashlib.sha1("Inihaw na Liempo".casefold().encode()).hexdigest()[:12],
    "pritong-tilapia": "phfood_" + hashlib.sha1("Pritong Tilapia".casefold().encode()).hexdigest()[:12],
    "tortang-itlog": "phfood_" + hashlib.sha1("Tortang Itlog with Kamatis".casefold().encode()).hexdigest()[:12],
    "tuna-guisado": "phfood_" + hashlib.sha1("Ginisang Tuna Flakes with Patatas".casefold().encode()).hexdigest()[:12],
}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def convert(path: Path) -> None:
    target = OUTPUT / (path.stem + ".webp")
    if "--force-images" not in sys.argv and target.exists() and target.stat().st_mtime >= path.stat().st_mtime:
        return
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((1200, 675), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=79, method=5)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest_items = {item["id"]: item for item in manifest["items"]}
    generated = json.loads(GENERATED.read_text(encoding="utf-8")) if GENERATED.exists() else []
    generated_by_id = {item["id"]: item for item in generated}
    completed = [item for item in manifest["items"] if item["image_status"] == "completed"]
    filenames = [(item["id"], item["image"]["filename"]) for item in completed]
    filenames += [(item["id"], item["filename"]) for item in generated]
    if len({item_id for item_id, _ in filenames}) != len(filenames):
        raise ValueError("Generated catalog duplicates a completed manifest ID")
    entries = [SOURCE / filename for _, filename in filenames]
    missing = [str(path) for path in entries if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing canonical catalog images: {missing[:5]}")
    dishes = json.loads(DISHES.read_text(encoding="utf-8"))
    merienda = json.loads(MERIENDA.read_text(encoding="utf-8"))
    recipe_ingredients = {r["image_id"]: r["ingredients"] for r in json.loads(RECIPES.read_text(encoding="utf-8"))} if RECIPES.exists() else {}
    records = []
    for path in entries:
        manifest_id = path.stem.split("__", 1)[0]
        source_item = manifest_items.get(manifest_id, {})
        title = source_item.get("title") or generated_by_id.get(manifest_id, {}).get("title") or path.stem.split("__", 1)[-1].replace("-", " ").title()
        records.append({
            "id": path.stem,
            "manifest_id": manifest_id,
            "title": title,
            "category": category_for(title, recipe_ingredients.get(path.stem)),
            "image": f"/food/{path.stem}.webp",
            "source_url": next((source["url"] for source in source_item.get("sources", []) if source.get("url")), None),
            "recipe_slug": None,
            "merienda_slug": None,
        })
    # Match the existing hand-costed recipes to their archive photo. Only clear
    # matches replace an existing photo; ambiguous ones retain their old image.
    used = set()
    for dish in dishes:
        explicit_id = EXPLICIT_MATCHES.get(dish["slug"])
        if explicit_id:
            rec = next((rec for rec in records if rec["manifest_id"] == explicit_id), None)
            if rec is None or rec["id"] in used:
                raise ValueError(f"Missing or reused explicit image match: {dish['slug']}")
        else:
            rec = None
        candidates = [slug(dish["name_tl"]), slug(dish["name_en"]), dish["slug"]]
        if rec is None:
            ranked = sorted(
                ((max(SequenceMatcher(None, candidate, slug(row["title"])).ratio() for candidate in candidates), row)
                 for row in records if row["id"] not in used),
                key=lambda pair: pair[0], reverse=True,
            )
            if ranked and ranked[0][0] >= 0.84:
                rec = ranked[0][1]
        if rec:
            rec["recipe_slug"] = dish["slug"]
            dish["image"] = rec["image"]
            used.add(rec["id"])
    for snack in merienda:
        match = next((rec for rec in records if rec["image"] == snack["image"]), None)
        if match:
            match["merienda_slug"] = snack["slug"]
    # An archive image can also point to an existing recipe whose preferred
    # image was generated separately.
    for rec in records:
        if rec["manifest_id"] == "phfood_6c486d0e1027":  # Mechado
            rec["recipe_slug"] = "mechado"
    featured = {slug: index for index, slug in enumerate(["chicken-adobo", "sinigang-na-baboy", "tortang-talong", "pancit-canton"])}
    merienda_order = {snack["slug"]: index for index, snack in enumerate(merienda)}
    def order(rec: dict) -> tuple:
        stable = hashlib.sha1(rec["id"].encode()).hexdigest()
        if rec["recipe_slug"] in featured: return (0, featured[rec["recipe_slug"]], stable)
        if rec["merienda_slug"] in merienda_order: return (1, merienda_order[rec["merienda_slug"]], stable)
        if rec["recipe_slug"]: return (2, stable, stable)
        return (3, stable, stable)
    records.sort(key=order)
    CATALOG.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    DISHES.write_text(json.dumps(dishes, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Cataloged {len(records)} photos; matched {len(used)} existing recipes", flush=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(convert, path) for path in entries]
        for i, future in enumerate(as_completed(futures), 1):
            future.result()
            if i % 200 == 0:
                print(f"Optimized {i}/{len(entries)} photos", flush=True)
    expected = {path.stem + ".webp" for path in entries}
    stale = [path for path in OUTPUT.glob("phfood_*.webp") if path.name not in expected]
    for path in stale:
        path.unlink()
    print(f"Removed {len(stale)} legacy alternate WebP files; original PNGs remain untouched", flush=True)
    print("Image import complete", flush=True)


if __name__ == "__main__":
    main()
