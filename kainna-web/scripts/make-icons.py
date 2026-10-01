"""Build Kain Na! brand art and a multi-resolution browser favicon."""

from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
subprocess.run(["node", str(ROOT / "scripts" / "make-brand.mjs")], cwd=ROOT, check=True)
with Image.open(ROOT / "public" / "icons" / "icon-512.png") as image:
    image.save(ROOT / "src" / "app" / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
