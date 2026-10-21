"""Verify that each catalog image has a usable recipe and source photo."""

from collections import Counter
from pathlib import Path
import json
import sys


WEB = Path(__file__).resolve().parents[1]
DATA = WEB / "src/data"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


catalog = load("catalog.json")
dishes = {item["slug"]: item for item in load("dishes.json")}
merienda = {item["slug"]: item for item in load("merienda.json")}
ingredient_ids = {item["id"] for item in load("ingredients.json")}
catalog_recipes = load("catalog-recipes.json")
drafts = {item["image_id"]: item for item in catalog_recipes}
problems = []

for label, values in (
    ("catalog IDs", [item["id"] for item in catalog]),
    ("catalog recipe IDs", [item["image_id"] for item in catalog_recipes]),
):
    problems.extend(f"Duplicate {label}: {key}" for key, count in Counter(values).items() if count > 1)

counts = Counter()
for item in catalog:
    image_id = item["id"]
    image = WEB / "public" / item["image"].lstrip("/")
    if not image.is_file():
        problems.append(f"{image_id}: missing source image")
    if item.get("recipe_slug"):
        counts["ulam"] += 1
        recipe = dishes.get(item["recipe_slug"])
        steps_key = "steps_short"
    elif item.get("merienda_slug"):
        counts["merienda"] += 1
        recipe = merienda.get(item["merienda_slug"])
        steps_key = "steps"
    else:
        counts["catalog"] += 1
        recipe = drafts.get(image_id)
        steps_key = "steps"
    if recipe is None:
        problems.append(f"{image_id}: missing recipe")
        continue
    for field in ("ingredients", steps_key):
        values = recipe.get(field)
        if field == "ingredients" and steps_key == "steps_short":
            valid = isinstance(values, list) and bool(values) and all(
                isinstance(value, dict) and value.get("ingredient_id") in ingredient_ids
                and isinstance(value.get("qty"), (int, float)) and value["qty"] > 0
                for value in values
            )
        else:
            valid = isinstance(values, list) and bool(values) and all(
                isinstance(value, str) and bool(value.strip()) for value in values
            )
        if not valid:
            problems.append(f"{image_id}: missing or empty {field}")

unknown = set(drafts) - {item["id"] for item in catalog}
problems.extend(f"Unknown catalog recipe ID: {image_id}" for image_id in sorted(unknown))
print(
    f"Catalog {len(catalog)}; ulam links {counts['ulam']}; merienda links {counts['merienda']}; "
    f"catalog recipes {counts['catalog']}; issues {len(problems)}"
)
for problem in problems[:30]:
    print(problem)
sys.exit(bool(problems))
