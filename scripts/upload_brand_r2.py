"""Mirror the production vector mark and derived site icons to R2."""

from pathlib import Path
import hashlib
import mimetypes
import os
import time
import tomllib

import requests


ROOT = Path(__file__).resolve().parents[1]
BUCKET = os.getenv("R2_BUCKET", "kainna")
PREFIX = "brand/supplied-k-v2"
ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects"
TOKEN_FILE = Path.home() / "AppData/Roaming/xdg.config/.wrangler/config/default.toml"
FILES = {
    "brand/kain-na-mark.svg": ROOT / "public/brand/kain-na-mark.svg",
    "brand/kain-na-logo.svg": ROOT / "public/brand/kain-na-logo.svg",
    "brand/kain-na-mark-footer.svg": ROOT / "public/brand/kain-na-mark-footer.svg",
    "favicon.ico": ROOT / "src/app/favicon.ico",
    "favicon-32.png": ROOT / "public/favicon-32.png",
    "icons/apple-touch-icon.png": ROOT / "public/icons/apple-touch-icon.png",
    "icons/icon-192.png": ROOT / "public/icons/icon-192.png",
    "icons/icon-512.png": ROOT / "public/icons/icon-512.png",
    "icons/icon-maskable-512.png": ROOT / "public/icons/icon-maskable-512.png",
    "opengraph-image.png": ROOT / "src/app/opengraph-image.png",
    "twitter-image.png": ROOT / "src/app/twitter-image.png",
    "linen-paper-v1.webp": ROOT / "public/brand/linen-paper-v1.webp",
}

for name, path in FILES.items():
    key = f"{PREFIX}/{name}"
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix == ".svg":
        content_type = "image/svg+xml"
    token = tomllib.loads(TOKEN_FILE.read_text(encoding="utf-8"))["oauth_token"]
    with path.open("rb") as body:
        response = requests.put(
            f"{URL}/{key}", data=body, timeout=60,
            headers={"Authorization": f"Bearer {token}", "Content-Type": content_type,
                     "Cache-Control": "public, max-age=31536000, immutable"},
        )
    response.raise_for_status()
    data = response.json()
    if not data.get("success") or data.get("result", {}).get("key") != key \
            or int(data["result"]["size"]) != path.stat().st_size:
        raise RuntimeError(f"Upload mismatch: {key}: {data.get('errors')}")
    public = requests.head(f"https://cdn.kainna.ph/{key}", timeout=30)
    public.raise_for_status()
    if public.headers.get("content-type", "").split(";")[0] != content_type:
        raise RuntimeError(f"CDN content type mismatch: {key}: {public.headers.get('content-type')}")
    downloaded = requests.get(f"https://cdn.kainna.ph/{key}", timeout=30)
    downloaded.raise_for_status()
    if hashlib.sha256(downloaded.content).digest() != hashlib.sha256(path.read_bytes()).digest():
        raise RuntimeError(f"CDN content mismatch: {key}")
    print(f"Verified {key} ({path.stat().st_size} bytes)", flush=True)
    time.sleep(0.5)
