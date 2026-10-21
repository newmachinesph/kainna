"""Collect visible article context where a linked page has no complete Recipe schema."""

from pathlib import Path
import json
import re
import time

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[3]
RESEARCH = ROOT / "preview/recipe-research.jsonl"
OUTPUT = ROOT / "preview/recipe-research-fallback.jsonl"
HEADERS = {"User-Agent": "KainNaRecipeResearch/1.0 (+https://kainna.ph)"}
rows = [json.loads(line) for line in RESEARCH.read_text(encoding="utf-8").splitlines() if line.strip()]
done = {json.loads(line)["image_id"] for line in OUTPUT.read_text(encoding="utf-8").splitlines()
        if line.strip()} if OUTPUT.exists() else set()
pending = [row for row in rows if row["status"] != "researched" and row["image_id"] not in done]
pages = {}


def excerpt_for(page, title):
    soup = BeautifulSoup(page, "html.parser")
    article = soup.select_one("article") or soup.select_one("main") or soup
    for unwanted in article.select("script,style,nav,footer,aside,form"):
        unwanted.decompose()
    text = article.get_text(" ", strip=True)
    clean_title = re.sub(r"[^a-z0-9]+", " ", title.casefold()).strip()
    headings = article.select("h2,h3,h4")
    matches = [heading.get_text(" ", strip=True) for heading in headings
               if clean_title in re.sub(r"[^a-z0-9]+", " ", heading.get_text(" ", strip=True).casefold())]
    if matches:
        position = text.find(matches[-1])
        if position >= 0:
            return text[max(0, position - 100):position + 3000]
    positions = [match.start() for match in re.finditer(re.escape(title), text, re.I)]
    if positions and len(text) > 5500:
        position = positions[-1]
        return text[max(0, position - 150):position + 3000]
    return text[:5500]


print(f"Researching {len(pending)} source pages without complete structured recipes", flush=True)
for index, row in enumerate(pending, 1):
    url = row["source_url"]
    if url not in pages:
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            pages[url] = response.text
        except requests.RequestException:
            pages[url] = ""
        time.sleep(1)
    excerpt = excerpt_for(pages[url], row["title"]) if pages[url] else ""
    output = {**row, "status": "fallback" if excerpt else "fallback_fetch_error",
              "source_excerpt": excerpt}
    with OUTPUT.open("a", encoding="utf-8") as file:
        file.write(json.dumps(output, ensure_ascii=False) + "\n")
    if index % 20 == 0 or index == len(pending):
        print(f"Fallback research {index}/{len(pending)}", flush=True)
