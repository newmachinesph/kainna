"""Idempotently copy optimized local food images into MinIO."""

from pathlib import Path
import json
import os
import re
import time

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError

IMAGE_DIR = Path(os.getenv("SALO_IMAGE_DIR", "/images"))
BUCKET = os.getenv("S3_BUCKET", "salosalo-food")
client = boto3.client(
    "s3",
    endpoint_url=os.getenv("S3_ENDPOINT", "http://minio:9000"),
    aws_access_key_id=os.getenv("S3_ACCESS_KEY", "salosalo"),
    aws_secret_access_key=os.getenv("S3_SECRET_KEY", "salosalo-local-2026"),
    region_name="us-east-1",
)

for attempt in range(60):
    try:
        client.list_buckets()
        break
    except EndpointConnectionError:
        time.sleep(2)
else:
    raise RuntimeError("MinIO was not ready")

try:
    client.create_bucket(Bucket=BUCKET)
except ClientError as error:
    if error.response["Error"]["Code"] not in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
        raise

client.put_bucket_policy(Bucket=BUCKET, Policy=json.dumps({
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": "*", "Action": ["s3:GetObject"], "Resource": [f"arn:aws:s3:::{BUCKET}/*"]}],
}))

files = sorted(IMAGE_DIR.glob("*.webp"))
expected = {path.name for path in files}
for index, path in enumerate(files, 1):
    needs_upload = True
    try:
        remote = client.head_object(Bucket=BUCKET, Key=path.name)
        needs_upload = (remote["ContentLength"] != path.stat().st_size
                        or remote.get("Metadata", {}).get("asset-version") != "clean-v3")
    except ClientError as error:
        if error.response["Error"]["Code"] not in {"404", "NoSuchKey", "NotFound"}:
            raise
    if needs_upload:
        client.upload_file(str(path), BUCKET, path.name, ExtraArgs={"ContentType": "image/webp", "CacheControl": "public, max-age=31536000, immutable", "Metadata": {"asset-version": "clean-v3"}})
    if index % 200 == 0:
        print(f"Seeded {index}/{len(files)} images", flush=True)

# The original importer uploaded bare-ID recovery attempts as distinct food.
# Retire only those known legacy object names; leave all other bucket data alone.
removed = 0
page = client.get_paginator("list_objects_v2")
for batch in page.paginate(Bucket=BUCKET):
    for obj in batch.get("Contents", []):
        key = obj["Key"]
        if key not in expected and re.fullmatch(r"phfood_[0-9a-f]{12}(?:_rejected_\d+)?\.webp", key):
            client.delete_object(Bucket=BUCKET, Key=key)
            removed += 1
print(f"MinIO synced {len(files)} catalog images; retired {removed} legacy alternate objects", flush=True)
