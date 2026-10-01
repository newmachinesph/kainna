"""Check staged recipe drafts and publish only a complete, original catalog set."""

from collections import Counter
from pathlib import Path
import argparse
import json
import math
import re
import sys


ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "preview/recipe-research.jsonl"
DRAFTS = ROOT / "preview/catalog-recipe-drafts.jsonl"
CORRECTIONS = ROOT / "preview/catalog-recipe-corrections.jsonl"
MANUAL_FIXES = ROOT / "preview/catalog-recipe-manual-fixes.jsonl"
REPAIRS = ROOT / "preview/catalog-recipe-repairs.jsonl"
SEEDS = WEB / "src/data/catalog-recipes.json"
CATALOG = WEB / "src/data/catalog.json"
TAGALOG = re.compile(
    r"\b(?:mga|ang|sa|ng|para|hanggang|ihain|ilagay|haluin|lutuin|"
    r"pakuluan|igisa|maikling|balatan|hiwain|timplahan|pagkatapos|"
    r"malambot|malutong|malinamnam|sariwang|mantika)\b", re.I
)


def grams(text, size=5):
    tokens = re.findall(r"[a-z0-9]+", text.casefold())
    return {tuple(tokens[index:index + size]) for index in range(len(tokens) - size + 1)}


def load_lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()] if path.exists() else []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    existing = json.loads(SEEDS.read_text(encoding="utf-8"))
    linked = {item["id"] for item in catalog if item.get("recipe_slug") or item.get("merienda_slug")}
    needed = {item["id"] for item in catalog} - linked
    researched = {item["image_id"]: item for item in load_lines(RESEARCH)}
    drafts = load_lines(DRAFTS)
    for shard in sorted((ROOT / "preview").glob("catalog-recipe-drafts-shard-*.jsonl")):
        drafts.extend(load_lines(shard))
    corrections = {item["image_id"]: item for item in load_lines(CORRECTIONS)}
    corrections.update({item["image_id"]: item for item in load_lines(MANUAL_FIXES)})
    corrections.update({item["image_id"]: item for item in load_lines(REPAIRS)})
    if unknown_corrections := set(corrections) - {item["image_id"] for item in drafts}:
        print(f"Corrections without staged drafts: {list(unknown_corrections)[:10]}")
        sys.exit(1)
    drafts = [corrections.get(item["image_id"], item) for item in drafts]
    existing_counts = Counter(item["image_id"] for item in existing)
    draft_counts = Counter(item["image_id"] for item in drafts)
    all_recipes = list({item["image_id"]: item for item in existing + drafts}.values())
    counts = Counter(item["image_id"] for item in all_recipes)
    problems = []
    duplicate = [key for key in counts if existing_counts[key] > 1 or draft_counts[key] > 1]
    if duplicate:
        problems.append(f"Duplicate IDs: {duplicate[:10]}")
    if unknown := set(counts) - needed:
        problems.append(f"Unexpected IDs: {list(unknown)[:10]}")
    missing = needed - set(counts)
    if missing:
        problems.append(f"Missing {len(missing)} IDs; examples: {list(sorted(missing))[:10]}")
    for recipe in all_recipes:
        image_id = recipe["image_id"]
        if not isinstance(recipe.get("intro"), str) or len(recipe["intro"].strip()) < 25:
            problems.append(f"{image_id}: intro too short")
        if not isinstance(recipe.get("minutes"), int) or not 5 <= recipe["minutes"] <= 10080:
            problems.append(f"{image_id}: unreasonable minutes")
        if not isinstance(recipe.get("servings"), int) or not 1 <= recipe["servings"] <= 60:
            problems.append(f"{image_id}: unreasonable servings")
        ingredients, steps = recipe.get("ingredients", []), recipe.get("steps", [])
        source = researched.get(image_id)
        source_count = len(source.get("ingredients", [])) if source else 0
        minimum_ingredients = min(3, source_count) if source_count else 2
        if not isinstance(ingredients, list) or len(ingredients) < minimum_ingredients or any(
                not isinstance(value, str) or len(value.strip()) < 3 for value in ingredients):
            problems.append(f"{image_id}: insufficient ingredients")
        if not isinstance(steps, list) or len(steps) < 3 or sum(
                isinstance(value, str) and len(value.strip()) >= 15 for value in steps) < 3:
            problems.append(f"{image_id}: insufficient directions")
        if any("<" in value or ">" in value for value in [recipe["intro"], *ingredients, *steps]):
            problems.append(f"{image_id}: HTML or markup in text")
        if len(TAGALOG.findall(recipe["intro"] + " " + " ".join(steps))) >= 3:
            problems.append(f"{image_id}: directions need English normalization")
        if source and source.get("status") == "researched":
            preserved_source = any("curing salt" in value.casefold() for value in source["ingredients"])
            prepared_ingredient = any("prepared cured" in value.casefold() for value in ingredients)
            if (len(ingredients) < max(minimum_ingredients, math.ceil(len(source["ingredients"]) * 0.5))
                    and not (preserved_source and prepared_ingredient)):
                problems.append(f"{image_id}: source ingredients may be missing")
            source_grams = grams(" ".join(source["instructions"]))
            draft_grams = grams(" ".join(steps))
            overlap = len(source_grams & draft_grams) / max(1, len(draft_grams))
            if overlap > 0.3:
                problems.append(f"{image_id}: directions too similar to source ({overlap:.1%})")
    print(f"Catalog {len(catalog)}; linked {len(linked)}; seeded {len(existing)}; "
          f"staged {len(drafts)}; missing {len(missing)}; issues {len(problems)}")
    for problem in problems[:30]:
        print(problem)
    if args.publish and not problems:
        by_id = {recipe["image_id"]: recipe for recipe in all_recipes}
        ordered = [by_id[item["id"]] for item in catalog if item["id"] in needed]
        SEEDS.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Published {len(ordered)} catalog recipes to {SEEDS}")
    elif args.publish:
        sys.exit(1)


if __name__ == "__main__":
    main()
