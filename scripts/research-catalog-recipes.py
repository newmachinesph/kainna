"""Collect structured recipe facts from the catalog's linked publishers.

This writes a local research cache, not publishable recipe text. Recipe drafts
must use original wording and pass review before entering catalog-recipes.json.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse
import json
import re
import time

import requests


ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "preview" / "recipe-research.jsonl"
CATALOG = json.loads((WEB / "src/data/catalog.json").read_text(encoding="utf-8"))
SEEDED = {item["image_id"] for item in json.loads((WEB / "src/data/catalog-recipes.json").read_text(encoding="utf-8"))}
PENDING = [item for item in CATALOG if not item.get("recipe_slug") and not item.get("merienda_slug")
           and item["id"] not in SEEDED]
done = {item["image_id"] for line in OUTPUT.read_text(encoding="utf-8").splitlines()
        if line.strip() for item in [json.loads(line)]} if OUTPUT.exists() else set()
lock = Lock()
next_request = {}
HEADERS = {"User-Agent": "KainNaRecipeResearch/1.0 (+https://kainna.ph)"}
SCRIPT_RE = re.compile(r"<script\b[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", re.I | re.S)


def flatten(value):
    if isinstance(value, list):
        for item in value:
            yield from flatten(item)
    elif isinstance(value, dict):
        yield value
        if "@graph" in value:
            yield from flatten(value["@graph"])


def instruction_text(value):
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [text for item in value for text in instruction_text(item)]
    if isinstance(value, dict):
        if value.get("itemListElement"):
            return instruction_text(value["itemListElement"])
        return [value.get("text", "")] if value.get("text") else []
    return []


def normalize(text):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(text))).strip()


def research(item):
    host = urlparse(item["source_url"]).netloc
    with lock:
        now = time.monotonic()
        start = max(now, next_request.get(host, 0))
        next_request[host] = start + 1.0
    if start > now:
        time.sleep(start - now)
    result = {"image_id": item["id"], "title": item["title"], "source_url": item["source_url"]}
    try:
        response = requests.get(item["source_url"], headers=HEADERS, timeout=30)
        result["http_status"] = response.status_code
        response.raise_for_status()
        recipes = []
        for script in SCRIPT_RE.findall(response.text):
            try:
                recipes.extend(node for node in flatten(json.loads(script)) if
                               "Recipe" in ([node.get("@type")] if isinstance(node.get("@type"), str)
                                            else node.get("@type", [])))
            except (ValueError, TypeError):
                continue
        if not recipes:
            result["status"] = "no_structured_recipe"
            return result
        source = max(recipes, key=lambda recipe: SequenceMatcher(
            None, item["title"].casefold(), normalize(recipe.get("name", "")).casefold()).ratio())
        result.update(
            status="researched",
            source_title=normalize(source.get("name", "")),
            ingredients=[normalize(value) for value in source.get("recipeIngredient", []) if normalize(value)],
            instructions=[normalize(value) for value in instruction_text(source.get("recipeInstructions", [])) if normalize(value)],
            total_time=source.get("totalTime"),
            prep_time=source.get("prepTime"),
            cook_time=source.get("cookTime"),
            yield_text=source.get("recipeYield"),
        )
        if len(result["ingredients"]) < 2 or len(result["instructions"]) < 2:
            result["status"] = "incomplete_source"
    except requests.RequestException as error:
        result.update(status="fetch_error", error=str(error)[:200])
    return result


print(f"Researching {len(PENDING) - len(done)} of {len(PENDING)} missing catalog recipes", flush=True)
stats = {}
with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(research, item): item for item in PENDING if item["id"] not in done}
    for index, future in enumerate(as_completed(futures), 1):
        result = future.result()
        with OUTPUT.open("a", encoding="utf-8") as file:
            file.write(json.dumps(result, ensure_ascii=False) + "\n")
        stats[result["status"]] = stats.get(result["status"], 0) + 1
        if index % 100 == 0 or index == len(futures):
            print(f"Researched {index}/{len(futures)}: {stats}", flush=True)
