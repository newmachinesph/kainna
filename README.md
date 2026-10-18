# Kain Na!

A Filipino recipe collection and weekly meal planner for budget-conscious households in the Philippines. Live at **[kainna.ph](https://kainna.ph)**.

- Over 1,600 Filipino dishes with ingredients, cooking steps, and schema.org Recipe markup
- A seven-day ulam plan sized to a daily budget and household, with estimated costs in pesos
- A grouped palengke (market) shopping list
- Household accounts with invitations, shared plans, and saved recipes

Prices are estimates from a Philippine wet-market price list, not live quotes.

## Repository layout

| Path | What it is |
|---|---|
| [`kainna-web/`](kainna-web/) | Next.js 16 + React 19 frontend (Tailwind CSS 4, Zustand) |
| [`api/`](api/) | FastAPI backend: catalog, recipes, prices, auth, households, admin |
| [`kainna-web/src/data/`](kainna-web/src/data/) | Catalog and recipe JSON the API seeds from |
| [`compose.yaml`](compose.yaml) | Local stack: web, API, and MinIO for images |

In production, kainna.ph runs on Railway, with PostgreSQL for data, Upstash Redis for rate limiting, and Cloudflare R2 behind `cdn.kainna.ph` for food photos.

## Run it locally

With Docker:

```sh
docker compose up --build
```

The web app is at http://localhost:3000, the API at http://localhost:8000, and the MinIO console at http://localhost:9001. Every port binds to `127.0.0.1` only. To load food photos into MinIO, put them in `kainna-web/public/food/` and run `docker compose run --rm seed-images`.

Without Docker:

```sh
# API
cd api
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://user:password@localhost:5432/kainna
uvicorn main:app --reload --port 8000

# Web, in a second terminal
cd kainna-web
npm install
npm run dev
```

The API creates its tables on startup. If `DATABASE_URL` is not set, it falls back to a throwaway local file so you can try the app or run the tests without a database server. The Docker stack does this too. **The first account registered becomes the site admin.**

## Configuration

API:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (works behind PgBouncer in transaction mode) |
| `SALO_DATA_DIR` | Catalog JSON directory (default `kainna-web/src/data`) |
| `S3_PUBLIC_BASE` | Public base URL for food images |
| `SALO_MEDIA_VERSION` | Image set version used in image URLs |
| `SALO_COOKIE_SECURE` | Set to `1` to mark the session cookie `Secure` (needed in production) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis used to rate limit login, signup, and invitations |
| `PROXY_SHARED_KEY` | Shared secret that lets the API trust the client IP relayed by the web proxy, for rate limiting |

Web:

| Variable | Purpose |
|---|---|
| `API_INTERNAL_URL` | Where the web server reaches the API (default `http://127.0.0.1:8000`) |
| `SITE_URL` | Public site URL for canonical links, sitemap, and social cards |
| `PROXY_SHARED_KEY` | Must match the API's value |

Copy these into a local `.env` file, which git ignores. Never commit real values.

## Tests and checks

```sh
cd api && python test_flows.py      # household, roles, saved recipes, weekly publishing
cd kainna-web && npm run lint && npm run build
```

## Contributing

Issues and pull requests are welcome. Please keep changes focused and run the checks above before opening a PR.

## License

Released under the [MIT License](LICENSE).
