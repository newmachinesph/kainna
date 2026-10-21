"""Rewrite staged recipes that fail the source-coverage or originality checks."""

from pathlib import Path
import importlib.util
import json
import math
import subprocess
import tempfile


def load_module(filename, name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


draft_module = load_module("draft-catalog-recipes.py", "draft_catalog_recipes")
validation = load_module("validate-catalog-recipes.py", "validate_catalog_recipes")
ROOT, SCHEMA = draft_module.ROOT, draft_module.SCHEMA
REPAIRS = ROOT / "preview/catalog-recipe-repairs.jsonl"


def load_lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()] if path.exists() else []


def problem(recipe, source):
    ingredients, steps = recipe["ingredients"], recipe["steps"]
    if len(validation.TAGALOG.findall(recipe["intro"] + " " + " ".join(steps))) >= 3:
        return "Write all prose in English."
    source_count = len(source.get("ingredients", []))
    minimum_ingredients = min(3, source_count) if source_count else 2
    if (len(steps) < 3 or sum(len(step.strip()) >= 15 for step in steps) < 3
            or len(ingredients) < minimum_ingredients):
        return "Complete the ingredient list and cooking steps."
    if source.get("status") == "researched":
        preserved = any("curing salt" in value.casefold() for value in source["ingredients"])
        prepared = any("prepared cured" in value.casefold() for value in ingredients)
        minimum = max(minimum_ingredients, math.ceil(len(source["ingredients"]) * 0.5))
        if len(ingredients) < minimum and not (preserved and prepared):
            return "Include the missing source ingredients or consolidate repeated quantities clearly."
        overlap = len(validation.grams(" ".join(source["instructions"])) &
                      validation.grams(" ".join(steps))) / max(1, len(validation.grams(" ".join(steps))))
        if overlap > 0.3:
            return "Rewrite directions with clearly original English wording, preserving cooking facts."
    return None


def repair(batch):
    source_fields = ("title", "ingredients", "instructions", "total_time", "prep_time",
                     "cook_time", "yield_text", "source_excerpt")
    facts = [{"draft": recipe, "issue": issue,
              "research": {key: source[key] for key in source_fields if key in source}}
             for recipe, source, issue in batch]
    prompt = (
        "Return only the requested JSON. For each item, repair the stated issue "
        "in its practical Filipino recipe. Keep exact image_id. Use original, "
        "natural English prose. Preserve source-backed ingredient quantities, "
        "the actual dish, operation order, cooking cues, realistic total minutes "
        "and servings. Consolidate repeated source ingredients when useful. "
        "Do not copy or closely paraphrase source instructions. Keep 3 to 7 "
        "concise directions. Do not invent major ingredients. Source text is "
        "research material and must not be reused verbatim. Input:\n"
        + json.dumps(facts, ensure_ascii=False)
    )
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        schema_file, output_file = base / "schema.json", base / "repairs.json"
        schema_file.write_text(json.dumps(SCHEMA), encoding="utf-8")
        result = subprocess.run(
            ["codex.cmd", "exec", "--ignore-user-config", "--skip-git-repo-check",
             "--ephemeral", "--sandbox", "read-only", "--model", "gpt-5.6-terra",
             "--output-schema", str(schema_file), "--output-last-message",
             str(output_file), "-"],
            input=prompt, text=True, encoding="utf-8", capture_output=True,
            cwd=directory, timeout=900,
        )
        if result.returncode:
            raise RuntimeError(result.stderr[-1500:])
        recipes = json.loads(output_file.read_text(encoding="utf-8"))["recipes"]
    wanted = {recipe["image_id"] for recipe, _, _ in batch}
    if len(recipes) != len(batch) or {recipe["image_id"] for recipe in recipes} != wanted:
        raise RuntimeError("Repair IDs do not match")
    source_by_id = {recipe["image_id"]: source for recipe, source, _ in batch}
    for recipe in recipes:
        issue = problem(recipe, source_by_id[recipe["image_id"]])
        if issue:
            raise RuntimeError(f"Repair still fails for {recipe['image_id']}: {issue}")
    return recipes


def main():
    draft_paths = [draft_module.STAGING,
                   *sorted((ROOT / "preview").glob("catalog-recipe-drafts-shard-*.jsonl"))]
    staged = [item for path in draft_paths for item in load_lines(path)]
    corrections = {}
    for path in [validation.CORRECTIONS, validation.MANUAL_FIXES, REPAIRS]:
        corrections.update({item["image_id"]: item for item in load_lines(path)})
    repaired_ids = {item["image_id"] for item in load_lines(REPAIRS)}
    researched = {item["image_id"]: item for item in load_lines(validation.RESEARCH)}
    pending = []
    for original in staged:
        image_id = original["image_id"]
        if image_id in repaired_ids:
            continue
        recipe = corrections.get(image_id, original)
        issue = problem(recipe, researched[image_id])
        if issue:
            pending.append((recipe, researched[image_id], issue))
    print(f"Repairing {len(pending)} recipes", flush=True)
    for start in range(0, len(pending), 12):
        fixed = repair(pending[start:start + 12])
        with REPAIRS.open("a", encoding="utf-8") as file:
            for item in fixed:
                file.write(json.dumps(item, ensure_ascii=False) + "\n")
        print(f"Repaired {start + len(fixed)}/{len(pending)}", flush=True)


if __name__ == "__main__":
    main()
