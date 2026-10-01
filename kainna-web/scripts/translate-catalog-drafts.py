"""Normalize staged Tagalog recipe copy to English without changing recipe facts."""

from pathlib import Path
import importlib.util
import json
import re
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location("draft_catalog_recipes", Path(__file__).with_name("draft-catalog-recipes.py"))
draft_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(draft_module)
ROOT, SCHEMA, STAGING = draft_module.ROOT, draft_module.SCHEMA, draft_module.STAGING


CORRECTIONS = ROOT / "preview/catalog-recipe-corrections.jsonl"
TAGALOG = re.compile(
    r"\b(?:mga|ang|sa|ng|para|hanggang|ihain|ilagay|haluin|lutuin|"
    r"pakuluan|igisa|maikling|balatan|hiwain|timplahan|pagkatapos|"
    r"malambot|malutong|malinamnam|sariwang|mantika)\b", re.I
)


def needs_translation(recipe):
    prose = recipe["intro"] + " " + " ".join(recipe["steps"])
    return len(TAGALOG.findall(prose)) >= 3


def translate(batch):
    prompt = (
        "Return only the requested JSON. Translate the intro, ingredients, and "
        "steps for each Filipino recipe into natural, concise English. Retain "
        "Filipino dish names and ingredient names where appropriate. Preserve "
        "exact image_id, quantities, ingredient facts, minutes, servings, and "
        "the order and meaning of every cooking operation. Do not introduce "
        "new ingredients or instructions. Write original English sentences, "
        "avoiding close source phrasing. Output all recipes in input order. "
        "Recipes:\n" + json.dumps(batch, ensure_ascii=False)
    )
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        schema_file, output_file = base / "schema.json", base / "translated.json"
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
        translated = json.loads(output_file.read_text(encoding="utf-8"))["recipes"]
    wanted = {item["image_id"] for item in batch}
    if len(translated) != len(batch) or {item["image_id"] for item in translated} != wanted:
        raise RuntimeError("Translation batch IDs do not match")
    original = {item["image_id"]: item for item in batch}
    for item in translated:
        before = original[item["image_id"]]
        if item["minutes"] != before["minutes"] or item["servings"] != before["servings"]:
            raise RuntimeError(f"Timing or serving count changed for {item['image_id']}")
        if needs_translation(item):
            raise RuntimeError(f"Tagalog remains in {item['image_id']}")
    return translated


def main():
    paths = [STAGING, *sorted((ROOT / "preview").glob("catalog-recipe-drafts-shard-*.jsonl"))]
    staged = [json.loads(line) for path in paths if path.exists()
              for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    corrected = {json.loads(line)["image_id"] for line in CORRECTIONS.read_text(encoding="utf-8").splitlines()
                 if line.strip()} if CORRECTIONS.exists() else set()
    pending = [item for item in staged if needs_translation(item) and item["image_id"] not in corrected]
    print(f"Translating {len(pending)} staged recipes", flush=True)
    for start in range(0, len(pending), 15):
        translated = translate(pending[start:start + 15])
        with CORRECTIONS.open("a", encoding="utf-8") as file:
            for item in translated:
                file.write(json.dumps(item, ensure_ascii=False) + "\n")
        print(f"Translated {start + len(translated)}/{len(pending)}", flush=True)


if __name__ == "__main__":
    main()
