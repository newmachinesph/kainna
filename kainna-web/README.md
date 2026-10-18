# Kain Na! web

The setup guide and feature status are in the [repository README](../README.md).

For frontend work without Docker:

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Start FastAPI as well to load the catalog, recipes, and current market prices. Guest plans and saved recipes are kept in local storage; registered households sync through the API. Run `npm run build` to check the production build.

## Food images and brand assets

The catalog's original PNGs are in `../../Filipino Food Image Catalog/images`. To rebuild watermark-free WebP and AVIF delivery images from them, run from this directory:

```powershell
python scripts/import-catalog.py --force-images
node scripts/batch-optimize-food-images.mjs
```

The four variants per image are written to `../../preview/optimized-food-clean-v3`. Upload that complete set to R2 with `../api/upload_r2.py` and S3 credentials, or use `../api/upload_r2_oauth.py` with a logged-in Wrangler session and `R2_ACCOUNT_ID` set. The OAuth uploader respects Cloudflare's REST API limit and keeps a local resume checkpoint. After verifying the upload, set the API's `S3_PUBLIC_BASE` to `https://cdn.kainna.ph/clean-v3/full` and `SALO_MEDIA_VERSION` to `clean-v3`.

To make the approved subtle Facebook watermark on every full and thumbnail WebP/AVIF variant, run `node scripts/batch-optimize-food-images.mjs --watermark`. This writes a separate complete set to `../../preview/optimized-food-watermark-v1` and leaves the clean images intact. The text is `https://facebook.com/kainnarecipes`, centered near the bottom in translucent white. Upload the new directory with either R2 uploader; the target folder name selects the `watermark-v1` R2 prefix. Once the full upload is verified, set `S3_PUBLIC_BASE` to `https://cdn.kainna.ph/watermark-v1/full` and `SALO_MEDIA_VERSION` to `watermark-v1`.

The supplied plate-and-K vector is adapted into `public/brand/kain-na-mark.svg`, the canonical green plate and yellow leaf used in both navbar and footer. `public/brand/kain-na-mark-footer.svg` is an identical compatibility copy; `public/brand/kain-na-logo.svg` is the full wordmark for dark backgrounds. Run `python scripts/make-icons.py` after changing the mark to refresh the favicons, PWA icons, and social cards. `public/brand/linen-paper-v1.webp` supplies the soft paper texture beneath the CSS grid in `.feature-pattern`. The brand assets are mirrored to R2 at `brand/supplied-k-v2/` with `../api/upload_brand_r2.py`.

## Catalog recipe copy

Source notes for the catalog dishes are checkpointed in `../../preview/recipe-research.jsonl` and `../../preview/recipe-research-fallback.jsonl`. `scripts/draft-catalog-recipes.py` creates original English drafts through the authenticated Codex CLI. It supports `--shard-index` and `--shard-count` for parallel, independent batches. `scripts/translate-catalog-drafts.py` normalizes older Tagalog drafts, and `scripts/repair-catalog-drafts.py` revises drafts flagged for missing ingredients or source wording overlap. Run `python scripts/validate-catalog-recipes.py --publish` only after all drafts are complete and the checks pass; this writes the complete set to `src/data/catalog-recipes.json` for the API seed.

Run `python scripts/audit-catalog-completeness.py` to check that every catalog image has a source file, ingredients, and cooking steps. The catalog currently has 1,664 images and 1,663 unique recipe records because the Beef Mechado and Mechado images share one Mechado recipe.
