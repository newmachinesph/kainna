"""Reconcile the source manifest, local generations, image files, and web catalog."""

from pathlib import Path
import json


ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Filipino Food Image Catalog" / "images"
MANIFEST = ROOT / "Filipino Food Image Catalog" / "filipino_food_manifest.json"
GENERATED = WEB / "src" / "data" / "generated_catalog.json"
CATALOG = WEB / "src" / "data" / "catalog.json"
CATALOG_RECIPES = WEB / "src" / "data" / "catalog-recipes.json"
OPTIMIZED = WEB / "public" / "food"
REPORT = ROOT / "Filipino Food Image Catalog" / "catalog_match_report.json"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    generated = json.loads(GENERATED.read_text(encoding="utf-8")) if GENERATED.exists() else []
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    recipe_ids = {item["image_id"] for item in json.loads(CATALOG_RECIPES.read_text(encoding="utf-8"))}
    completed = {item["id"]: item for item in manifest["items"] if item["image_status"] == "completed"}
    pending = {item["id"]: item for item in manifest["items"] if item["image_status"] == "pending"}
    generated_ids = {item["id"] for item in generated}
    if len(generated_ids) != len(generated) or generated_ids & completed.keys():
        raise ValueError("Local generations contain a duplicate or completed manifest ID")
    new_titles = [item for item in generated if item["id"] not in pending]
    canonical = {item["id"]: item["image"]["filename"] for item in completed.values()}
    canonical.update({item["id"]: item["filename"] for item in generated})
    missing_png = [name for name in canonical.values() if not (SOURCE / name).is_file()]
    missing_webp = [Path(name).with_suffix(".webp").name for name in canonical.values()
                    if not (OPTIMIZED / Path(name).with_suffix(".webp").name).is_file()]
    catalog_ids = [item["manifest_id"] for item in catalog]
    catalog_filenames = {Path(item["image"]).with_suffix(".png").name for item in catalog}
    if (missing_png or missing_webp or len(catalog_ids) != len(set(catalog_ids))
            or set(catalog_ids) != canonical.keys() or catalog_filenames != set(canonical.values())):
        raise ValueError(json.dumps({"missing_png": missing_png[:10], "missing_webp": missing_webp[:10],
                                     "catalog_rows": len(catalog_ids), "canonical": len(canonical)}))
    source_pngs = list(SOURCE.glob("phfood_*.png"))
    report = {
        "target_unique_dishes": 2000,
        "source_manifest_titles": len(manifest["items"]),
        "source_completed_images": len(completed),
        "local_generated_images": len(generated),
        "unique_catalog_images": len(catalog),
        "remaining_named_manifest_titles": len(pending) - (len(generated) - len(new_titles)),
        "additional_verified_titles_needed_after_manifest": max(0, 2000 - len(manifest["items"]) - len(new_titles)),
        "uncataloged_archive_alternates": len(source_pngs) - len(canonical),
        "remaining_to_target": max(0, 2000 - len(catalog)),
        "ulam_without_catalog_image": [item["slug"] for item in json.loads((WEB / "src" / "data" / "dishes.json").read_text(encoding="utf-8"))
                                      if not str(item.get("image") or "").startswith("/food/")],
        "merienda_without_catalog_image": [item["slug"] for item in json.loads((WEB / "src" / "data" / "merienda.json").read_text(encoding="utf-8"))
                                          if not str(item.get("image") or "").startswith("/food/")],
        "catalog_images_without_in_app_recipe": sum(not item.get("recipe_slug") and not item.get("merienda_slug") and item["id"] not in recipe_ids for item in catalog),
        "catalog_images_without_recipe_source": sum(not item.get("recipe_slug") and not item.get("merienda_slug") and item["id"] not in recipe_ids and not item.get("source_url") for item in catalog),
    }
    details = {
        "summary": report,
        "pending_manifest_titles": [{"id": item["id"], "title": item["title"]} for item in pending.values() if item["id"] not in generated_ids],
        "catalog_without_in_app_recipe": [{"id": item["id"], "title": item["title"]} for item in catalog
                                          if not item.get("recipe_slug") and not item.get("merienda_slug") and item["id"] not in recipe_ids],
    }
    REPORT.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"Full title-level report: {REPORT}")


if __name__ == "__main__":
    main()
