"""Draft original catalog recipe copy from the local source-research cache.

Uses the authenticated Codex CLI; no OpenAI API key is needed. Output is a
checkpointed staging file. Run validate-catalog-recipes.py before publishing.
"""

from pathlib import Path
import argparse
import json
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[3]
RESEARCH = ROOT / "preview" / "recipe-research.jsonl"
FALLBACK = ROOT / "preview" / "recipe-research-fallback.jsonl"
STAGING = ROOT / "preview" / "catalog-recipe-drafts.jsonl"
SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["recipes"],
    "properties": {
        "recipes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["image_id", "intro", "minutes", "servings", "ingredients", "steps"],
                "properties": {
                    "image_id": {"type": "string"},
                    "intro": {"type": "string"},
                    "minutes": {"type": "integer"},
                    "servings": {"type": "integer"},
                    "ingredients": {"type": "array", "items": {"type": "string"}},
                    "steps": {"type": "array", "items": {"type": "string"}},
                },
            },
        }
    },
}


def draft_batch(batch):
    source_fields = ("image_id", "title", "ingredients", "instructions", "total_time",
                     "prep_time", "cook_time", "yield_text", "source_excerpt")
    facts = [{key: item[key] for key in source_fields if key in item} for item in batch]
    instructions = (
        "Return only the requested JSON. Write one practical, complete Filipino "
        "recipe for each item, matching its exact image_id and title. Write all "
        "intros, ingredient descriptions, and cooking steps in natural English. "
        "Keep Filipino dish and ingredient names, but use no Tagalog sentences. Keep intros "
        "to one short sentence. The supplied "
        "publisher data is research material, not copy for reuse. Ingredients and "
        "quantities are facts: preserve them accurately while standardizing the "
        "list for home cooks. Write an original one-sentence intro and original "
        "cooking directions; never quote or closely paraphrase source instructions. "
        "Include each meaningful operation, order, heat level, timing and doneness "
        "cue from the research in 3 to 7 concise steps, usually no more than 25 "
        "words per step. Do not invent major ingredients or omit major "
        "ingredients. Use realistic total minutes and servings from source metadata "
        "when present. Each recipe needs at least 3 steps; use all source "
        "ingredients, including simple recipes with only two. "
        "For records with a source_excerpt in place of complete structured recipe "
        "data, use the excerpt as the factual starting point. Write a practical "
        "home preparation or serving recipe for the named item. Some article "
        "excerpts contain neighboring dishes: ignore those. Use prepared "
        "versions of cured or fermented foods when the excerpt lacks detailed "
        "preparation guidance. When structured source instructions provide "
        "those details, use them accurately without inventing extra steps. "
        "Keep every recipe distinct. Source data:\n"
        + json.dumps(facts, ensure_ascii=False)
    )
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        schema_file = base / "schema.json"
        output_file = base / "draft.json"
        schema_file.write_text(json.dumps(SCHEMA), encoding="utf-8")
        result = subprocess.run(
            ["codex.cmd", "exec", "--ignore-user-config", "--skip-git-repo-check",
             "--ephemeral", "--sandbox", "read-only", "--model", "gpt-5.6-terra",
             "--output-schema",
             str(schema_file), "--output-last-message", str(output_file), "-"],
            input=instructions, text=True, encoding="utf-8", capture_output=True,
            cwd=directory, timeout=900,
        )
        if result.returncode:
            raise RuntimeError(f"Codex exit {result.returncode}: {result.stderr[-1500:]}")
        return json.loads(output_file.read_text(encoding="utf-8"))["recipes"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--shard-index", type=int, default=-1)
    parser.add_argument("--shard-count", type=int, default=1)
    args = parser.parse_args()
    if args.shard_index >= args.shard_count or args.shard_index < -1:
        parser.error("shard-index must be less than shard-count")
    output_path = (ROOT / f"preview/catalog-recipe-drafts-shard-{args.shard_index}.jsonl"
                   if args.shard_index >= 0 else STAGING)
    researched = [json.loads(line) for line in RESEARCH.read_text(encoding="utf-8").splitlines()
                  if line.strip()]
    if FALLBACK.exists():
        replacements = {item["image_id"]: item for line in FALLBACK.read_text(encoding="utf-8").splitlines()
                        if line.strip() for item in [json.loads(line)]}
        researched = [replacements.get(item["image_id"], item) for item in researched]
    stage_files = [STAGING, *sorted((ROOT / "preview").glob("catalog-recipe-drafts-shard-*.jsonl"))]
    done = {json.loads(line)["image_id"] for path in stage_files if path.exists()
            for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}
    pending = [item for index, item in enumerate(researched)
               if (args.shard_index < 0 or index % args.shard_count == args.shard_index)
               and item["status"] in {"researched", "fallback"}
               and item["image_id"] not in done]
    if args.limit:
        pending = pending[:args.limit]
    print(f"Drafting {len(pending)} source-researched recipes", flush=True)
    for start in range(0, len(pending), args.batch_size):
        batch = pending[start:start + args.batch_size]
        drafts = draft_batch(batch)
        wanted = {item["image_id"] for item in batch}
        actual = [draft["image_id"] for draft in drafts]
        if len(drafts) != len(batch) or set(actual) != wanted or len(set(actual)) != len(actual):
            raise RuntimeError(f"Batch IDs do not match: expected {wanted}; got {actual}")
        with output_path.open("a", encoding="utf-8") as file:
            for draft in drafts:
                file.write(json.dumps(draft, ensure_ascii=False) + "\n")
        print(f"Drafted {start + len(batch)}/{len(pending)}", flush=True)


if __name__ == "__main__":
    main()
