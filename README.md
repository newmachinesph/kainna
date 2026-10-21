# Kain Na!

A Filipino recipe collection and weekly meal planner for budget-conscious households in the Philippines. Live at **[kainna.ph](https://kainna.ph)**.

- Over 1,600 Filipino dishes with ingredients, cooking steps, and schema.org Recipe markup
- A seven-day ulam plan sized to a daily budget and household, with estimated costs in pesos
- A grouped palengke (market) shopping list
- Household accounts with invitations, shared plans, and saved recipes

Prices are estimates from a Philippine wet-market price list, not live quotes.

## Repository layout

One Next.js 16 app (React 19, Tailwind CSS 4, Zustand) serves both the pages and the REST API.

| Path | What it is |
|---|---|
| [`src/app/`](src/app/) | Pages, plus the REST API under [`src/app/v1/`](src/app/v1/) (catalog, recipes, prices, auth, households, admin) |
| [`src/server/`](src/server/) | Server-only code: MySQL access, schema and seeding, auth, and the API logic |
| [`src/data/`](src/data/) | Catalog and recipe JSON the database seeds from |
| [`scripts/`](scripts/) | Image, catalog and R2 tooling, the API flow test, and the one-off PostgreSQL to MySQL copy |
| [`compose.yaml`](compose.yaml) | A local MariaDB for development |

In production, kainna.ph runs on Hostinger as a single Node.js app with MySQL, behind Cloudflare DNS, with food photos on Cloudflare R2 behind `cdn.kainna.ph`.

## Run it locally

```sh
docker compose up -d db
npm install
DATABASE_URL=mysql://kainna:kainna-local@127.0.0.1:3306/kainna npm run dev
```

Open http://localhost:3000. The app creates its tables and imports the catalog JSON on the first request. Import files only add missing rows; after that the database owns them. **The first account registered becomes the site admin.**

## Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL or MariaDB connection string, `mysql://user:password@host:3306/database`. On Hostinger use host `127.0.0.1` |
| `DATABASE_POOL_SIZE` | Maximum MySQL connections per process (default 5) |
| `SITE_URL` | Public site URL for canonical links, sitemap, and social cards. Read at build time too |
| `S3_PUBLIC_BASE` | Public base URL for food images (default `https://cdn.kainna.ph/watermark-v1/full`) |
| `SALO_MEDIA_VERSION` | Image set version used in image URLs (default `watermark-v1`) |
| `SALO_COOKIE_SECURE` | Set to `1` to mark the session cookie `Secure` (needed in production) |

Login, signup and invitations are rate limited in the `rate_limits` table. Copy these into a local `.env` file, which git ignores. Never commit real values.

## Tests and checks

```sh
npm run lint && npm run build
# With the app running against an empty database:
BASE_URL=http://localhost:3000 node scripts/test-flows.mjs
```

## Contributing

Issues and pull requests are welcome. Please keep changes focused and run the checks above before opening a PR.

## License

Released under the [MIT License](LICENSE).
