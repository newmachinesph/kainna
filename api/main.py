"""Local Kain Na! catalog, recipes, and saved-recipes API."""

from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
import math
import os
import random
import re
import secrets
import hashlib
import sqlite3
from zoneinfo import ZoneInfo

from database import PostgresConnection

from fastapi import FastAPI, HTTPException, Query, Cookie, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash

DATA = Path(os.getenv("SALO_DATA_DIR", Path(__file__).resolve().parents[1] / "kainna-web" / "src" / "data"))
DB = Path(os.getenv("SALO_DB_PATH", Path(__file__).resolve().parent / "data" / "salo.db"))
DATABASE_URL = os.getenv("DATABASE_URL")
PUBLIC_MEDIA_BASE = os.getenv("S3_PUBLIC_BASE", "http://localhost:9000/salosalo-food").rstrip("/")
MEDIA_VERSION = os.getenv("SALO_MEDIA_VERSION", "clean-v3")
SESSION_COOKIE = "salosalo_session"
SESSION_DAYS = 14
password_hash = PasswordHash.recommended()


def read_seed(name: str) -> list[dict]:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def round_price(amount: float) -> int:
    """Keep stored PHP estimates in five-peso increments."""
    return max(5, math.floor(amount / 5 + 0.5) * 5)


def with_media(item: dict) -> dict:
    image = item.get("image")
    if isinstance(image, str) and image.startswith("/food/"):
        return {**item, "image": f"{PUBLIC_MEDIA_BASE}/{image.rsplit('/', 1)[-1]}?v={MEDIA_VERSION}"}
    return item


@contextmanager
def connection():
    if DATABASE_URL:
        db = PostgresConnection(DATABASE_URL)
    else:
        DB.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(DB)
        db.row_factory = sqlite3.Row
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    else:
        db.commit()
    finally:
        db.close()


def initialize(db: sqlite3.Connection) -> None:
    db.executescript("""
        CREATE TABLE IF NOT EXISTS catalog_items (
            id TEXT PRIMARY KEY,
            position INTEGER NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            recipe_slug TEXT,
            merienda_slug TEXT,
            payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS catalog_title ON catalog_items(title);
        CREATE INDEX IF NOT EXISTS catalog_category ON catalog_items(category);
        CREATE TABLE IF NOT EXISTS recipes (
            slug TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            cook_minutes INTEGER NOT NULL,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalog_recipes (
            image_id TEXT PRIMARY KEY REFERENCES catalog_items(id),
            payload TEXT NOT NULL,
            updated_by TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ingredients (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS saved_recipes (
            visitor_id TEXT NOT NULL,
            recipe_slug TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (visitor_id, recipe_slug)
        );
        CREATE TABLE IF NOT EXISTS households (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            household_id TEXT NOT NULL REFERENCES households(id),
            role TEXT NOT NULL CHECK(role IN ('owner', 'member')),
            is_site_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS users_household ON users(household_id);
        CREATE UNIQUE INDEX IF NOT EXISTS one_owner_per_household ON users(household_id) WHERE role = 'owner';
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invitations (
            code_hash TEXT PRIMARY KEY,
            household_id TEXT NOT NULL REFERENCES households(id),
            email TEXT NOT NULL,
            created_by TEXT NOT NULL REFERENCES users(id),
            expires_at TEXT NOT NULL,
            used_at TEXT
        );
        CREATE TABLE IF NOT EXISTS featured_weeks (
            week_start TEXT PRIMARY KEY,
            slugs_json TEXT NOT NULL,
            updated_by TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS household_states (
            household_id TEXT PRIMARY KEY REFERENCES households(id),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    # Import files only add missing rows. SQLite owns existing rows after the first run.
    catalog_seed = read_seed("catalog.json")
    canonical_ids = {item["manifest_id"]: item["id"] for item in catalog_seed}
    # The first importer counted bare-ID recovery attempts as separate dishes.
    # Remove only that known legacy shape when a canonical image exists.
    for row in db.execute("SELECT id, payload FROM catalog_items").fetchall():
        item = json.loads(row["payload"])
        legacy_id = row["id"]
        legacy_match = re.fullmatch(r"(phfood_[0-9a-f]{12})(?:_rejected_\d+)?", legacy_id)
        manifest_id = legacy_match.group(1) if legacy_match else item.get("manifest_id")
        if (legacy_match and manifest_id in canonical_ids and legacy_id != canonical_ids[manifest_id]):
            db.execute("DELETE FROM catalog_items WHERE id = ?", (legacy_id,))
    db.executemany(
        "INSERT OR IGNORE INTO catalog_items(id, position, title, category, recipe_slug, merienda_slug, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ((item["id"], index, item["title"], item["category"], item.get("recipe_slug"), item.get("merienda_slug"), json.dumps(item, ensure_ascii=False))
         for index, item in enumerate(catalog_seed)),
    )
    db.executemany(
        "UPDATE catalog_items SET position = ? WHERE id = ?",
        ((index, item["id"]) for index, item in enumerate(catalog_seed)),
    )
    for item in catalog_seed:
        if not item.get("recipe_slug") and not item.get("merienda_slug"):
            continue
        row = db.execute("SELECT payload FROM catalog_items WHERE id = ?", (item["id"],)).fetchone()
        payload = json.loads(row["payload"])
        if payload.get("recipe_slug") != item.get("recipe_slug") or payload.get("merienda_slug") != item.get("merienda_slug"):
            payload.update(recipe_slug=item.get("recipe_slug"), merienda_slug=item.get("merienda_slug"))
            db.execute("UPDATE catalog_items SET recipe_slug = ?, merienda_slug = ?, payload = ? WHERE id = ?",
                       (item.get("recipe_slug"), item.get("merienda_slug"), json.dumps(payload, ensure_ascii=False), item["id"]))
    for kind, filename in (("ulam", "dishes.json"), ("merienda", "merienda.json")):
        recipe_seed = read_seed(filename)
        db.executemany(
            "INSERT OR IGNORE INTO recipes(slug, kind, title, cook_minutes, payload) VALUES (?, ?, ?, ?, ?)",
            ((item["slug"], kind, item.get("name_tl") or item["title"], item.get("cook_minutes") or item.get("minutes") or 0, json.dumps(item, ensure_ascii=False))
             for item in recipe_seed),
        )
        for item in recipe_seed:
            if not str(item.get("image") or "").startswith("/food/"):
                continue
            row = db.execute("SELECT payload FROM recipes WHERE slug = ?", (item["slug"],)).fetchone()
            payload = json.loads(row["payload"])
            if payload.get("image") != item["image"]:
                payload["image"] = item["image"]
                payload["image_credit"] = item.get("image_credit")
                db.execute("UPDATE recipes SET payload = ? WHERE slug = ?", (json.dumps(payload, ensure_ascii=False), item["slug"]))
    db.executemany("INSERT OR IGNORE INTO ingredients(id, payload) VALUES (?, ?)",
                   ((item["id"], json.dumps(item, ensure_ascii=False)) for item in read_seed("ingredients.json")))
    catalog_titles = {row["id"]: row["title"] for row in db.execute("SELECT id, title FROM catalog_items").fetchall()}
    catalog_recipe_rows = []
    seeded_at = utc_now().isoformat()
    for draft in read_seed("catalog-recipes.json"):
        title = catalog_titles.get(draft["image_id"])
        if title is None:
            continue
        recipe = {key: value for key, value in draft.items() if key != "image_id"}
        recipe["title"] = title
        catalog_recipe_rows.append((draft["image_id"], json.dumps(recipe, ensure_ascii=False), seeded_at))
    db.executemany("INSERT OR IGNORE INTO catalog_recipes(image_id, payload, updated_at) VALUES (?, ?, ?)", catalog_recipe_rows)
    for row in db.execute("SELECT id, payload FROM ingredients").fetchall():
        item = json.loads(row["payload"])
        rounded = round_price(item["price_php"])
        if item["price_php"] != rounded:
            item["price_php"] = rounded
            db.execute("UPDATE ingredients SET payload = ? WHERE id = ?", (json.dumps(item, ensure_ascii=False), row["id"]))
    if db.execute("SELECT COUNT(*) FROM featured_weeks").fetchone()[0] == 0:
        initial_slugs = ["chicken-adobo", "tortang-talong", "sinigang-na-baboy", "sarciadong-isda",
                         "ginisang-monggo", "tinolang-manok", "bicol-express"]
        if all((recipe := get_recipe(db, slug, "ulam")) and recipe.get("image") for slug in initial_slugs):
            db.execute("INSERT INTO featured_weeks(week_start, slugs_json, updated_at) VALUES (?, ?, ?)",
                       (week_monday(), json.dumps(initial_slugs), utc_now().isoformat()))


def get_recipe(db: sqlite3.Connection, slug: str, kind: str | None = None) -> dict | None:
    if kind:
        row = db.execute("SELECT payload FROM recipes WHERE slug = ? AND kind = ?", (slug, kind)).fetchone()
    else:
        row = db.execute("SELECT payload FROM recipes WHERE slug = ?", (slug,)).fetchone()
    return with_media(json.loads(row["payload"])) if row else None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    with connection() as db:
        initialize(db)
    yield


app = FastAPI(title="Kain Na! API", version="1.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["*"])


@app.get("/health")
def health():
    with connection() as db:
        catalog_count = db.execute("SELECT COUNT(*) FROM catalog_items").fetchone()[0]
        ulam_count = db.execute("SELECT COUNT(*) FROM recipes WHERE kind = 'ulam'").fetchone()[0]
        merienda_count = db.execute("SELECT COUNT(*) FROM recipes WHERE kind = 'merienda'").fetchone()[0]
        catalog_recipe_count = db.execute("SELECT COUNT(*) FROM catalog_recipes").fetchone()[0]
    return {"status": "ok", "catalog_images": catalog_count, "ulam_recipes": ulam_count, "merienda_recipes": merienda_count, "catalog_recipes": catalog_recipe_count}


@app.get("/v1/catalog")
def list_catalog(
    q: str = "",
    category: str = "",
    recipes_only: bool = False,
    rotate: str = Query(default="", pattern="^(daily|weekly)?$"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=24, ge=1, le=100),
):
    clauses = []
    args: list[str] = []
    if q.strip():
        clauses.append("title LIKE ?")
        args.append(f"%{q.strip()}%")
    if category:
        clauses.append("category = ? COLLATE NOCASE")
        args.append(category)
    if recipes_only:
        clauses.append("(recipe_slug IS NOT NULL OR merienda_slug IS NOT NULL OR EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id))")
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connection() as db:
        total = db.execute(f"SELECT COUNT(*) FROM catalog_items {where}", args).fetchone()[0]
        if rotate:
            # Same order for everyone until the day (or week) turns over in Manila.
            ids = [row["id"] for row in db.execute(f"SELECT id FROM catalog_items {where} ORDER BY position", args).fetchall()]
            rotation_rng(rotate, f"catalog:{category.lower()}").shuffle(ids)
            ids = ids[(page - 1) * limit:page * limit]
            found = {row["id"]: row for row in db.execute(f"SELECT id, payload, EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id) AS has_catalog_recipe FROM catalog_items WHERE id IN ({','.join('?' * len(ids))})", ids).fetchall()} if ids else {}
            rows = [found[item_id] for item_id in ids]
        else:
            rows = db.execute(f"SELECT payload, EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id) AS has_catalog_recipe FROM catalog_items {where} ORDER BY position LIMIT ? OFFSET ?", (*args, limit, (page - 1) * limit)).fetchall()
    return {"items": [{**with_media(json.loads(row["payload"])), "has_catalog_recipe": bool(row["has_catalog_recipe"])} for row in rows], "total": total, "page": page, "limit": limit}


@app.get("/v1/seo-index")
def seo_index():
    """Public routes for the web sitemap, sourced from the current database."""
    with connection() as db:
        catalog = db.execute("SELECT image_id FROM catalog_recipes ORDER BY image_id").fetchall()
        ulam = db.execute("SELECT slug FROM recipes WHERE kind = 'ulam' ORDER BY slug").fetchall()
        merienda = db.execute("SELECT slug FROM recipes WHERE kind = 'merienda' ORDER BY slug").fetchall()
    return {
        "catalog_ids": [row["image_id"] for row in catalog],
        "ulam_slugs": [row["slug"] for row in ulam],
        "merienda_slugs": [row["slug"] for row in merienda],
    }


@app.get("/v1/catalog/{image_id}")
def catalog_item(image_id: str):
    with connection() as db:
        row = db.execute("SELECT payload FROM catalog_items WHERE id = ?", (image_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Image not found")
        item = json.loads(row["payload"])
        recipe = get_recipe(db, item["recipe_slug"]) if item.get("recipe_slug") else None
        merienda = get_recipe(db, item["merienda_slug"]) if item.get("merienda_slug") else None
        catalog_row = db.execute("SELECT payload FROM catalog_recipes WHERE image_id = ?", (image_id,)).fetchone()
        catalog_recipe = json.loads(catalog_row["payload"]) if catalog_row else None
    return {**with_media(item), "recipe": recipe, "merienda": merienda, "catalog_recipe": catalog_recipe}


@app.get("/v1/recipes")
def list_recipes(q: str = "", quick: bool = False):
    clauses = ["kind = 'ulam'"]
    args: list[str] = []
    if q.strip():
        clauses.append("title LIKE ?")
        args.append(f"%{q.strip()}%")
    if quick:
        clauses.append("cook_minutes <= 30")
    with connection() as db:
        rows = db.execute(f"SELECT payload FROM recipes WHERE {' AND '.join(clauses)} ORDER BY title", args).fetchall()
    items = [with_media(json.loads(row["payload"])) for row in rows]
    return {"items": items, "total": len(items)}


@app.get("/v1/recipes/{slug}")
def recipe(slug: str):
    with connection() as db:
        item = get_recipe(db, slug, "ulam")
    if item is None:
        raise HTTPException(404, "Recipe not found")
    return item


@app.get("/v1/merienda")
def list_merienda():
    with connection() as db:
        rows = db.execute("SELECT payload FROM recipes WHERE kind = 'merienda' ORDER BY title").fetchall()
    items = [with_media(json.loads(row["payload"])) for row in rows]
    return {"items": items, "total": len(items)}


@app.get("/v1/merienda/{slug}")
def merienda_recipe(slug: str):
    with connection() as db:
        item = get_recipe(db, slug, "merienda")
    if item is None:
        raise HTTPException(404, "Recipe not found")
    return item


class SaveRecipe(BaseModel):
    recipe_slug: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def week_monday() -> str:
    today = datetime.now(ZoneInfo("Asia/Singapore")).date()
    return (today - timedelta(days=today.weekday())).isoformat()


def rotation_rng(period: str, scope: str) -> random.Random:
    """Seeded by the Manila day or week, so picks change on schedule but stay stable in between."""
    key = week_monday() if period == "weekly" else datetime.now(ZoneInfo("Asia/Singapore")).date().isoformat()
    return random.Random(f"{scope}:{key}")


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def user_view(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "email": row["email"], "display_name": row["display_name"],
            "household_id": row["household_id"], "role": row["role"], "is_site_admin": bool(row["is_site_admin"])}


def session_user(salosalo_session: str | None = Cookie(default=None)) -> dict:
    if not salosalo_session:
        raise HTTPException(401, "Sign in required")
    with connection() as db:
        row = db.execute("""
            SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
        """, (token_digest(salosalo_session), utc_now().isoformat())).fetchone()
    if row is None:
        raise HTTPException(401, "Session expired")
    return user_view(row)


def owner_user(user: dict = Depends(session_user)) -> dict:
    if user["role"] != "owner":
        raise HTTPException(403, "Household owner required")
    return user


def admin_user(user: dict = Depends(session_user)) -> dict:
    if not user["is_site_admin"]:
        raise HTTPException(403, "Site admin required")
    return user


def issue_session(db: sqlite3.Connection, response: Response, user_id: str) -> None:
    raw_token = secrets.token_urlsafe(32)
    now = utc_now()
    db.execute("INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
               (token_digest(raw_token), user_id, (now + timedelta(days=SESSION_DAYS)).isoformat(), now.isoformat()))
    response.set_cookie(SESSION_COOKIE, raw_token, max_age=SESSION_DAYS * 86400, path="/",
                        httponly=True, secure=os.getenv("SALO_COOKIE_SECURE") == "1", samesite="lax")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)
    household_name: str | None = Field(default=None, max_length=100)
    invite_code: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/v1/auth/register", status_code=201)
def register(payload: RegisterRequest, response: Response):
    email = str(payload.email).strip().lower()
    display_name = payload.display_name.strip()
    if not display_name:
        raise HTTPException(400, "Name is required")
    now = utc_now()
    user_id = secrets.token_hex(16)
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(409, "Email is already registered")
        if payload.invite_code:
            invite = db.execute("SELECT * FROM invitations WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?",
                                (token_digest(payload.invite_code.strip()), now.isoformat())).fetchone()
            if invite is None or invite["email"] != email:
                raise HTTPException(400, "Invitation is invalid or expired")
            household_id = invite["household_id"]
            if db.execute("SELECT COUNT(*) FROM users WHERE household_id = ?", (household_id,)).fetchone()[0] >= 3:
                raise HTTPException(409, "This household already has three accounts")
            role, is_admin = "member", 0
            db.execute("UPDATE invitations SET used_at = ? WHERE code_hash = ?", (now.isoformat(), invite["code_hash"]))
        else:
            if not payload.household_name or not payload.household_name.strip():
                raise HTTPException(400, "Household name is required")
            household_id = secrets.token_hex(16)
            db.execute("INSERT INTO households(id, name, created_at) VALUES (?, ?, ?)",
                       (household_id, payload.household_name.strip(), now.isoformat()))
            role = "owner"
            is_admin = int(db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0)
        db.execute("""
            INSERT INTO users(id, email, password_hash, display_name, household_id, role, is_site_admin, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, email, password_hash.hash(payload.password), display_name, household_id, role, is_admin, now.isoformat()))
        issue_session(db, response, user_id)
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"user": user_view(row), "max_household_accounts": 3}


@app.post("/v1/auth/login")
def login(payload: LoginRequest, response: Response):
    email = str(payload.email).strip().lower()
    with connection() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None or not password_hash.verify(payload.password, row["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        issue_session(db, response, row["id"])
    return {"user": user_view(row)}


@app.get("/v1/auth/me")
def current_user(user: dict = Depends(session_user)):
    return {"user": user}


@app.post("/v1/auth/logout")
def logout(response: Response, salosalo_session: str | None = Cookie(default=None)):
    if salosalo_session:
        with connection() as db:
            db.execute("DELETE FROM sessions WHERE token_hash = ?", (token_digest(salosalo_session),))
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"signed_out": True}


class InviteRequest(BaseModel):
    email: EmailStr


@app.get("/v1/household/members")
def household_members(user: dict = Depends(session_user)):
    with connection() as db:
        household = db.execute("SELECT name FROM households WHERE id = ?", (user["household_id"],)).fetchone()
        rows = db.execute("SELECT * FROM users WHERE household_id = ? ORDER BY created_at", (user["household_id"],)).fetchall()
        pending = db.execute("SELECT email, expires_at FROM invitations WHERE household_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY expires_at",
                             (user["household_id"], utc_now().isoformat())).fetchall()
    return {"household_name": household["name"], "members": [user_view(row) for row in rows],
            "pending_invitations": [dict(row) for row in pending], "max_accounts": 3}


@app.post("/v1/household/invitations", status_code=201)
def create_invitation(payload: InviteRequest, user: dict = Depends(owner_user)):
    email = str(payload.email).strip().lower()
    now = utc_now()
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        occupied = db.execute("SELECT COUNT(*) FROM users WHERE household_id = ?", (user["household_id"],)).fetchone()[0]
        pending = db.execute("SELECT COUNT(*) FROM invitations WHERE household_id = ? AND used_at IS NULL AND expires_at > ?",
                             (user["household_id"], now.isoformat())).fetchone()[0]
        if occupied + pending >= 3:
            raise HTTPException(409, "Only two additional members are allowed")
        if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(409, "Email is already registered")
        if db.execute("SELECT 1 FROM invitations WHERE household_id = ? AND email = ? AND used_at IS NULL AND expires_at > ?",
                      (user["household_id"], email, now.isoformat())).fetchone():
            raise HTTPException(409, "An invitation is already pending for this email")
        code = secrets.token_urlsafe(24)
        expires = now + timedelta(days=7)
        db.execute("INSERT INTO invitations(code_hash, household_id, email, created_by, expires_at) VALUES (?, ?, ?, ?, ?)",
                   (token_digest(code), user["household_id"], email, user["id"], expires.isoformat()))
    return {"email": email, "invite_code": code, "expires_at": expires.isoformat()}


@app.delete("/v1/household/members/{member_id}")
def remove_member(member_id: str, user: dict = Depends(owner_user)):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        member = db.execute("SELECT id FROM users WHERE id = ? AND household_id = ? AND role = 'member'",
                            (member_id, user["household_id"])).fetchone()
        if member is None:
            raise HTTPException(404, "Member not found")
        db.execute("DELETE FROM sessions WHERE user_id = ?", (member_id,))
        db.execute("DELETE FROM saved_recipes WHERE visitor_id = ?", (member_id,))
        db.execute("DELETE FROM users WHERE id = ?", (member_id,))
    return {"removed": member_id}


def featured_week_view(db: sqlite3.Connection, row: sqlite3.Row) -> dict:
    slugs = json.loads(row["slugs_json"])
    days = []
    for index, slug in enumerate(slugs):
        recipe = get_recipe(db, slug, "ulam")
        if recipe is None:
            raise HTTPException(503, "Featured recipe is unavailable")
        days.append({"day": index, "recipe": recipe})
    return {"week_start": row["week_start"], "days": days, "updated_at": row["updated_at"]}


@app.get("/v1/featured-week")
def featured_week(week_start: str | None = None):
    target = week_start or week_monday()
    try:
        datetime.fromisoformat(target)
    except ValueError:
        raise HTTPException(400, "Invalid week date")
    with connection() as db:
        row = db.execute("SELECT * FROM featured_weeks WHERE week_start = ?", (target,)).fetchone()
        if row is None:
            # No week published by an admin: pick seven dishes that stay fixed for that week.
            slugs = [item["slug"] for item in db.execute("SELECT slug, payload FROM recipes WHERE kind = 'ulam' ORDER BY slug").fetchall()
                     if json.loads(item["payload"]).get("image")]
            if len(slugs) < 7:
                raise HTTPException(404, "No featured week is available")
            row = {"week_start": target, "slugs_json": json.dumps(random.Random(f"featured:{target}").sample(slugs, 7)), "updated_at": None}
        return featured_week_view(db, row)


class FeaturedWeekRequest(BaseModel):
    slugs: list[str] = Field(min_length=7, max_length=7)


@app.put("/v1/admin/featured-week/{week_start}")
def publish_featured_week(week_start: str, payload: FeaturedWeekRequest, user: dict = Depends(admin_user)):
    try:
        parsed = datetime.strptime(week_start, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Use a YYYY-MM-DD Monday date")
    if parsed.weekday() != 0:
        raise HTTPException(400, "Featured weeks must start on Monday")
    if len(set(payload.slugs)) != 7:
        raise HTTPException(400, "Choose seven different recipes")
    with connection() as db:
        for slug in payload.slugs:
            recipe = get_recipe(db, slug, "ulam")
            if not recipe or not recipe.get("image"):
                raise HTTPException(400, f"Recipe has no available image: {slug}")
        now = utc_now().isoformat()
        db.execute("""
            INSERT INTO featured_weeks(week_start, slugs_json, updated_by, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(week_start) DO UPDATE SET slugs_json = excluded.slugs_json,
                updated_by = excluded.updated_by, updated_at = excluded.updated_at
        """, (week_start, json.dumps(payload.slugs), user["id"], now))
        row = db.execute("SELECT * FROM featured_weeks WHERE week_start = ?", (week_start,)).fetchone()
        return featured_week_view(db, row)


@app.get("/v1/me/saved")
def list_saved(user: dict = Depends(session_user)):
    with connection() as db:
        rows = db.execute("SELECT recipes.payload FROM saved_recipes JOIN recipes ON recipes.slug = saved_recipes.recipe_slug WHERE visitor_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    return {"items": [with_media(json.loads(row["payload"])) for row in rows]}


@app.put("/v1/me/saved")
def save_recipe(payload: SaveRecipe, user: dict = Depends(session_user)):
    with connection() as db:
        if get_recipe(db, payload.recipe_slug) is None:
            raise HTTPException(400, "Invalid recipe")
        db.execute("INSERT OR IGNORE INTO saved_recipes(visitor_id, recipe_slug) VALUES (?, ?)", (user["id"], payload.recipe_slug))
    return {"saved": payload.recipe_slug}


@app.delete("/v1/me/saved/{slug}")
def remove_saved(slug: str, user: dict = Depends(session_user)):
    with connection() as db:
        db.execute("DELETE FROM saved_recipes WHERE visitor_id = ? AND recipe_slug = ?", (user["id"], slug))
    return {"removed": slug}


@app.get("/v1/household/state")
def household_state(user: dict = Depends(session_user)):
    with connection() as db:
        row = db.execute("SELECT payload, updated_at FROM household_states WHERE household_id = ?", (user["household_id"],)).fetchone()
    return {"state": json.loads(row["payload"]) if row else None, "updated_at": row["updated_at"] if row else None}


class HouseholdStateRequest(BaseModel):
    state: dict


@app.put("/v1/household/state")
def save_household_state(payload: HouseholdStateRequest, user: dict = Depends(session_user)):
    allowed = {"locale", "onboarded", "household", "members", "plan", "history", "checkins", "swaps", "overlay", "bought", "swapTried"}
    state = {key: value for key, value in payload.state.items() if key in allowed}
    encoded = json.dumps(state, ensure_ascii=False)
    if len(encoded.encode("utf-8")) > 1_000_000:
        raise HTTPException(413, "Household state is too large")
    now = utc_now().isoformat()
    with connection() as db:
        db.execute("""INSERT INTO household_states(household_id, payload, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(household_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at""",
            (user["household_id"], encoded, now))
    return {"updated_at": now}


@app.get("/v1/ingredients")
def list_ingredients():
    with connection() as db:
        rows = db.execute("SELECT payload FROM ingredients ORDER BY id").fetchall()
    return {"items": [json.loads(row["payload"]) for row in rows], "total": len(rows)}


class PriceUpdate(BaseModel):
    price_php: float = Field(gt=0, le=1_000_000, allow_inf_nan=False)
    price_source: str = Field(min_length=2, max_length=120)


@app.put("/v1/admin/ingredients/{ingredient_id}")
def update_ingredient_price(ingredient_id: str, payload: PriceUpdate, user: dict = Depends(admin_user)):
    with connection() as db:
        row = db.execute("SELECT payload FROM ingredients WHERE id = ?", (ingredient_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Ingredient not found")
        item = json.loads(row["payload"])
        item.update(price_php=round_price(payload.price_php), price_source=payload.price_source,
                    price_updated_at=datetime.now(ZoneInfo("Asia/Singapore")).date().isoformat())
        db.execute("UPDATE ingredients SET payload = ? WHERE id = ?", (json.dumps(item, ensure_ascii=False), ingredient_id))
    return item


class RecipeUpdate(BaseModel):
    name_tl: str = Field(min_length=2, max_length=120)
    name_en: str = Field(min_length=2, max_length=120)
    description_tl: str = Field(min_length=10, max_length=2000)
    cook_minutes: int = Field(gt=0, le=1440)
    steps_short: list[str] = Field(min_length=1, max_length=30)


class CatalogRecipeUpdate(BaseModel):
    intro: str = Field(min_length=20, max_length=2000)
    minutes: int = Field(gt=0, le=1440)
    servings: int = Field(gt=0, le=40)
    ingredients: list[str] = Field(min_length=2, max_length=60)
    steps: list[str] = Field(min_length=2, max_length=40)


@app.get("/v1/admin/catalog/recipe-queue")
def catalog_recipe_queue(q: str = "", page: int = Query(default=1, ge=1), limit: int = Query(default=24, ge=1, le=100), user: dict = Depends(admin_user)):
    where = "recipe_slug IS NULL AND merienda_slug IS NULL AND NOT EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id)"
    args: list[str] = []
    if q.strip():
        where += " AND title LIKE ?"
        args.append(f"%{q.strip()}%")
    with connection() as db:
        total = db.execute(f"SELECT COUNT(*) FROM catalog_items WHERE {where}", args).fetchone()[0]
        rows = db.execute(f"SELECT payload FROM catalog_items WHERE {where} ORDER BY position LIMIT ? OFFSET ?", (*args, limit, (page - 1) * limit)).fetchall()
    return {"items": [with_media(json.loads(row["payload"])) for row in rows], "total": total, "page": page, "limit": limit}


@app.put("/v1/admin/catalog/{image_id}/recipe")
def publish_catalog_recipe(image_id: str, payload: CatalogRecipeUpdate, user: dict = Depends(admin_user)):
    ingredients = [value.strip() for value in payload.ingredients]
    steps = [value.strip() for value in payload.steps]
    if any(len(value) < 3 or len(value) > 300 for value in ingredients):
        raise HTTPException(400, "Each ingredient must be 3–300 characters")
    if any(len(value) < 10 or len(value) > 1000 for value in steps):
        raise HTTPException(400, "Each step must be 10–1000 characters")
    with connection() as db:
        row = db.execute("SELECT payload FROM catalog_items WHERE id = ?", (image_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Catalog image not found")
        item = json.loads(row["payload"])
        recipe = {"title": item["title"], "intro": payload.intro.strip(), "minutes": payload.minutes,
                  "servings": payload.servings, "ingredients": ingredients, "steps": steps}
        db.execute("""INSERT INTO catalog_recipes(image_id, payload, updated_by, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(image_id) DO UPDATE SET payload = excluded.payload, updated_by = excluded.updated_by, updated_at = excluded.updated_at""",
            (image_id, json.dumps(recipe, ensure_ascii=False), user["id"], utc_now().isoformat()))
    return {"image_id": image_id, "recipe": recipe}


@app.put("/v1/admin/recipes/{slug}")
def update_recipe(slug: str, payload: RecipeUpdate, user: dict = Depends(admin_user)):
    steps = [step.strip() for step in payload.steps_short]
    if any(len(step) < 3 or len(step) > 500 for step in steps):
        raise HTTPException(400, "Each step must be 3–500 characters")
    with connection() as db:
        row = db.execute("SELECT payload FROM recipes WHERE slug = ? AND kind = 'ulam'", (slug,)).fetchone()
        if row is None:
            raise HTTPException(404, "Recipe not found")
        item = json.loads(row["payload"])
        item.update(name_tl=payload.name_tl.strip(), name_en=payload.name_en.strip(),
                    description_tl=payload.description_tl.strip(), cook_minutes=payload.cook_minutes,
                    steps_short=steps)
        db.execute("UPDATE recipes SET title = ?, cook_minutes = ?, payload = ? WHERE slug = ?",
                   (item["name_tl"], item["cook_minutes"], json.dumps(item, ensure_ascii=False), slug))
    return with_media(item)
