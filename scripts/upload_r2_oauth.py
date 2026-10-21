"""Upload a complete food variant set with the existing Wrangler login.

The Cloudflare REST API has a 1,200 requests / five minute limit, so this
uploader paces requests and keeps a local checkpoint for safe resumption.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock, local
import json
import os
import sys
import time
import tomllib

import requests


SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else "../../preview/optimized-food-clean-v3").resolve()
PARTIAL = "--partial" in sys.argv
BUCKET = os.getenv("R2_BUCKET", "kainna")
ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
VERSION = os.getenv("R2_MEDIA_VERSION", SOURCE.name.removeprefix("optimized-food-"))
CHECKPOINT = SOURCE / f".uploaded-{VERSION}.txt"
WRANGLER_LOGIN = Path.home() / "AppData/Roaming/xdg.config/.wrangler/config/default.toml"
API_ROOT = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects"

files = sorted(path for folder in ("full", "thumbnail") for path in (SOURCE / folder).iterdir()
               if path.suffix in {".webp", ".avif"})
if PARTIAL:
    stems = {}
    for path in files:
        stems.setdefault(path.stem, []).append(path)
    cutoff = time.time() - 15
    files = [path for path in files if len(stems[path.stem]) == 4 and path.stat().st_mtime < cutoff]
else:
    report = json.loads((SOURCE / "report.json").read_text(encoding="utf-8"))
    if report["errors"] or len(files) != report["sourceImages"] * 4:
        raise RuntimeError("Local variant set is incomplete; refusing to upload")

completed = set(CHECKPOINT.read_text(encoding="utf-8").splitlines()) if CHECKPOINT.exists() else set()
lock = Lock()
last_request = [0.0]
thread_state = local()


def pace():
    # Stay below the account-wide 1,200 requests / five minute REST API limit.
    with lock:
        now = time.monotonic()
        start = max(now, last_request[0] + 0.31)
        last_request[0] = start
    if start > now:
        time.sleep(start - now)


def upload(path: Path):
    key = f"{VERSION}/{path.relative_to(SOURCE).as_posix()}"
    if key in completed:
        return "skipped"
    if not hasattr(thread_state, "session"):
        thread_state.session = requests.Session()
    content_type = "image/avif" if path.suffix == ".avif" else "image/webp"
    for attempt in range(8):
        pace()
        token = tomllib.loads(WRANGLER_LOGIN.read_text(encoding="utf-8"))["oauth_token"]
        with path.open("rb") as body:
            try:
                response = thread_state.session.put(
                    f"{API_ROOT}/{key}", data=body, timeout=60,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": content_type,
                        "Cache-Control": "public, max-age=31536000, immutable",
                    },
                )
            except requests.RequestException as error:
                if attempt == 7:
                    raise RuntimeError(f"{key}: {error}") from error
                time.sleep(min(2 ** attempt, 30))
                continue
        if response.status_code == 200:
            payload = response.json()
            if payload.get("success") and payload.get("result", {}).get("key") == key \
                    and int(payload["result"]["size"]) == path.stat().st_size:
                with lock:
                    with CHECKPOINT.open("a", encoding="utf-8") as checkpoint:
                        checkpoint.write(key + "\n")
                    completed.add(key)
                return "uploaded"
        if response.status_code == 429 or response.status_code >= 500:
            time.sleep(int(response.headers.get("retry-after", "0")) or min(2 ** attempt, 30))
            continue
        raise RuntimeError(f"{key}: HTTP {response.status_code} {response.text[:300]}")
    raise RuntimeError(f"{key}: retry limit reached")


stats = {"uploaded": 0, "skipped": 0, "errors": []}
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(upload, path): path for path in files}
    for index, future in enumerate(as_completed(futures), 1):
        try:
            stats[future.result()] += 1
        except Exception as error:
            stats["errors"].append(str(error))
        if index % 250 == 0 or index == len(files):
            print(f"Checked {index}/{len(files)} R2 objects; {stats['uploaded']} uploaded; {len(stats['errors'])} errors", flush=True)

print(json.dumps(stats))
if stats["errors"]:
    sys.exit(1)

if not PARTIAL:
    token = tomllib.loads(WRANGLER_LOGIN.read_text(encoding="utf-8"))["oauth_token"]
    remote = {}
    cursor = None
    while True:
        params = {"prefix": f"{VERSION}/", "per_page": 1000}
        if cursor:
            params["cursor"] = cursor
        response = requests.get(API_ROOT, params=params,
                                headers={"Authorization": f"Bearer {token}"}, timeout=60)
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success"):
            raise RuntimeError(f"R2 listing failed: {payload.get('errors')}")
        remote.update({item["key"]: item for item in payload["result"]})
        page = payload.get("result_info") or {}
        if not page.get("is_truncated"):
            break
        cursor = page.get("cursor")
        if not cursor:
            raise RuntimeError("R2 listing was truncated without a cursor")
    expected = {f"{VERSION}/{path.relative_to(SOURCE).as_posix()}": path for path in files}
    mismatches = [key for key, path in expected.items()
                  if key not in remote or remote[key]["size"] != path.stat().st_size
                  or (remote[key].get("http_metadata") or {}).get("contentType")
                  != ("image/avif" if path.suffix == ".avif" else "image/webp")]
    if mismatches:
        raise RuntimeError(f"R2 verification failed for {len(mismatches)} objects: {mismatches[:5]}")
    print(f"Verified {len(expected)} R2 objects against local sizes and content types", flush=True)

    token = tomllib.loads(WRANGLER_LOGIN.read_text(encoding="utf-8"))["oauth_token"]
    robots = requests.put(
        f"{API_ROOT}/robots.txt",
        data=b"User-agent: *\nAllow: /\n",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600"},
        timeout=60,
    )
    robots.raise_for_status()
    if not robots.json().get("success"):
        raise RuntimeError(f"R2 robots.txt update failed: {robots.text[:300]}")
    print("Uploaded crawlable media robots.txt", flush=True)
