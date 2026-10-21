"""Upload a verified food variant set to Cloudflare R2."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import os
import sys

import boto3
from botocore.exceptions import ClientError


SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else "../../preview/optimized-food-clean-v3")
BUCKET = os.getenv("R2_BUCKET", "kainna")
ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
ACCESS_KEY = os.environ["R2_ACCESS_KEY_ID"]
SECRET_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
VERSION = os.getenv("R2_MEDIA_VERSION", SOURCE.name.removeprefix("optimized-food-"))

client = boto3.client(
    "s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name="auto",
)


def upload(path: Path):
    key = f"{VERSION}/{path.relative_to(SOURCE).as_posix()}"
    size = path.stat().st_size
    try:
        remote = client.head_object(Bucket=BUCKET, Key=key)
        if remote["ContentLength"] == size and remote.get("Metadata", {}).get("asset-version") == VERSION:
            return "skipped", size
    except ClientError as error:
        if error.response["Error"]["Code"] not in {"404", "NoSuchKey", "NotFound"}:
            raise
    client.upload_file(
        str(path), BUCKET, key,
        ExtraArgs={
            "ContentType": "image/avif" if path.suffix == ".avif" else "image/webp",
            "CacheControl": "public, max-age=31536000, immutable",
            "Metadata": {"asset-version": VERSION},
        },
    )
    return "uploaded", size


files = sorted(path for folder in ("full", "thumbnail") for path in (SOURCE / folder).iterdir()
               if path.suffix in {".webp", ".avif"})
expected = json.loads((SOURCE / "report.json").read_text(encoding="utf-8"))
if expected["errors"] or len(files) != expected["sourceImages"] * 4:
    raise RuntimeError("Local variant set is incomplete; refusing to upload")

stats = {"uploaded": 0, "skipped": 0, "bytes": 0, "errors": []}
with ThreadPoolExecutor(max_workers=12) as pool:
    futures = {pool.submit(upload, path): path for path in files}
    for index, future in enumerate(as_completed(futures), 1):
        try:
            status, size = future.result()
            stats[status] += 1
            stats["bytes"] += size
        except Exception as error:
            stats["errors"].append({"key": futures[future].relative_to(SOURCE).as_posix(), "error": str(error)})
        if index % 500 == 0 or index == len(files):
            print(f"Checked {index}/{len(files)} R2 objects", flush=True)

print(json.dumps(stats))
if stats["errors"]:
    sys.exit(1)

client.put_object(
    Bucket=BUCKET,
    Key="robots.txt",
    Body=b"User-agent: *\nAllow: /\n",
    ContentType="text/plain; charset=utf-8",
    CacheControl="public, max-age=3600",
)
print("Uploaded media robots.txt")
