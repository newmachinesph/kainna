import catalogSeed from "@/data/catalog.json";
import catalogRecipeSeed from "@/data/catalog-recipes.json";
import dishesSeed from "@/data/dishes.json";
import ingredientsSeed from "@/data/ingredients.json";
import meriendaSeed from "@/data/merienda.json";
import type { Db, Row } from "./db";
import { nowIso, parseJson, roundPrice, weekMonday, type Json } from "./util";

const TABLE = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
const KEY = "VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin";

// Keys use binary collation so ids and slugs compare exactly; titles and emails stay case-insensitive.
export const DDL = [
  `CREATE TABLE IF NOT EXISTS catalog_items (id ${KEY} PRIMARY KEY, position INT NOT NULL, title VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL,
    recipe_slug ${KEY} NULL, merienda_slug ${KEY} NULL, payload MEDIUMTEXT NOT NULL, INDEX catalog_title (title), INDEX catalog_category (category), INDEX catalog_position (position)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS recipes (slug ${KEY} PRIMARY KEY, kind VARCHAR(20) NOT NULL, title VARCHAR(255) NOT NULL, cook_minutes INT NOT NULL, payload MEDIUMTEXT NOT NULL, INDEX recipes_kind_title (kind, title)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS catalog_recipes (image_id ${KEY} PRIMARY KEY, payload MEDIUMTEXT NOT NULL, updated_by ${KEY} NULL, updated_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (image_id) REFERENCES catalog_items(id)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS ingredients (id ${KEY} PRIMARY KEY, payload MEDIUMTEXT NOT NULL) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS households (id ${KEY} PRIMARY KEY, name VARCHAR(100) NOT NULL, created_at VARCHAR(40) NOT NULL) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS users (id ${KEY} PRIMARY KEY, email VARCHAR(191) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, display_name VARCHAR(80) NOT NULL,
    household_id ${KEY} NOT NULL, role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'member')), is_site_admin TINYINT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL,
    owner_household ${KEY} GENERATED ALWAYS AS (IF(role = 'owner', household_id, NULL)) STORED, UNIQUE INDEX one_owner_per_household (owner_household),
    INDEX users_household (household_id), FOREIGN KEY (household_id) REFERENCES households(id)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS saved_recipes (visitor_id ${KEY} NOT NULL, recipe_slug ${KEY} NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (visitor_id, recipe_slug)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, user_id ${KEY} NOT NULL, expires_at VARCHAR(40) NOT NULL,
    created_at VARCHAR(40) NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS invitations (code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, household_id ${KEY} NOT NULL, email VARCHAR(191) NOT NULL,
    created_by ${KEY} NOT NULL, expires_at VARCHAR(40) NOT NULL, used_at VARCHAR(40) NULL,
    FOREIGN KEY (household_id) REFERENCES households(id), FOREIGN KEY (created_by) REFERENCES users(id)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS featured_weeks (week_start VARCHAR(10) PRIMARY KEY, slugs_json TEXT NOT NULL, updated_by ${KEY} NULL, updated_at VARCHAR(40) NOT NULL) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS household_states (household_id ${KEY} PRIMARY KEY, payload MEDIUMTEXT NOT NULL, updated_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (household_id) REFERENCES households(id)) ${TABLE}`,
  `CREATE TABLE IF NOT EXISTS rate_limits (bucket VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY, hits INT NOT NULL, window_ends BIGINT NOT NULL) ${TABLE}`,
];

const INITIAL_FEATURED = ["chicken-adobo", "tortang-talong", "sinigang-na-baboy", "sarciadong-isda", "ginisang-monggo", "tinolang-manok", "bicol-express"];
const CHUNK = 200;

type CatalogSeed = { id: string; manifest_id: string; title: string; category: string; recipe_slug?: string | null; merienda_slug?: string | null } & Json;
type RecipeSeed = { slug: string; title?: string; name_tl?: string; cook_minutes?: number; minutes?: number; image?: string; image_credit?: unknown } & Json;

async function select(db: Db, sql: string, params: unknown[] = []): Promise<Row[]> {
  const [result] = await db.query<Row[]>(sql, params);
  return result;
}

async function insertMany(db: Db, sql: string, values: unknown[][]): Promise<void> {
  for (let start = 0; start < values.length; start += CHUNK) await db.query(sql, [values.slice(start, start + CHUNK)]);
}

/** Import files only add missing rows; the database owns existing rows after the first run. */
export async function initialize(db: Db): Promise<void> {
  for (const statement of DDL) await db.query(statement);
  const catalog = catalogSeed as CatalogSeed[];
  const canonicalIds = new Map(catalog.map((item) => [item.manifest_id, item.id]));
  // The first importer counted bare-ID recovery attempts as separate dishes. Remove only that known legacy shape.
  for (const row of await select(db, "SELECT id FROM catalog_items")) {
    const legacy = /^(phfood_[0-9a-f]{12})(?:_rejected_\d+)?$/.exec(String(row.id));
    if (legacy && canonicalIds.has(legacy[1]) && row.id !== canonicalIds.get(legacy[1])) await db.query("DELETE FROM catalog_items WHERE id = ?", [row.id]);
  }
  await insertMany(db, "INSERT INTO catalog_items (id, position, title, category, recipe_slug, merienda_slug, payload) VALUES ? ON DUPLICATE KEY UPDATE position = VALUES(position)",
    catalog.map((item, index) => [item.id, index, item.title, item.category, item.recipe_slug ?? null, item.merienda_slug ?? null, JSON.stringify(item)]));
  const storedCatalog = new Map((await select(db, "SELECT id, payload FROM catalog_items")).map((row) => [String(row.id), parseJson<Json>(row.payload)]));
  for (const item of catalog) {
    if (!item.recipe_slug && !item.merienda_slug) continue;
    const payload = storedCatalog.get(item.id);
    if (!payload || (payload.recipe_slug === item.recipe_slug && payload.merienda_slug === item.merienda_slug)) continue;
    const updated = { ...payload, recipe_slug: item.recipe_slug ?? null, merienda_slug: item.merienda_slug ?? null };
    await db.query("UPDATE catalog_items SET recipe_slug = ?, merienda_slug = ?, payload = ? WHERE id = ?", [updated.recipe_slug, updated.merienda_slug, JSON.stringify(updated), item.id]);
  }
  for (const [kind, seed] of [["ulam", dishesSeed], ["merienda", meriendaSeed]] as [string, RecipeSeed[]][]) {
    await insertMany(db, "INSERT IGNORE INTO recipes (slug, kind, title, cook_minutes, payload) VALUES ?",
      seed.map((item) => [item.slug, kind, item.name_tl || item.title, item.cook_minutes || item.minutes || 0, JSON.stringify(item)]));
    const stored = new Map((await select(db, "SELECT slug, payload FROM recipes WHERE slug IN (?)", [seed.map((item) => item.slug)])).map((row) => [String(row.slug), parseJson<Json>(row.payload)]));
    for (const item of seed) {
      const payload = stored.get(item.slug);
      if (!String(item.image ?? "").startsWith("/food/") || !payload || payload.image === item.image) continue;
      await db.query("UPDATE recipes SET payload = ? WHERE slug = ?", [JSON.stringify({ ...payload, image: item.image, image_credit: item.image_credit ?? null }), item.slug]);
    }
  }
  await insertMany(db, "INSERT IGNORE INTO ingredients (id, payload) VALUES ?", (ingredientsSeed as Json[]).map((item) => [item.id, JSON.stringify(item)]));
  const titles = new Map((await select(db, "SELECT id, title FROM catalog_items")).map((row) => [String(row.id), String(row.title)]));
  const seededAt = nowIso();
  await insertMany(db, "INSERT IGNORE INTO catalog_recipes (image_id, payload, updated_at) VALUES ?",
    (catalogRecipeSeed as ({ image_id: string } & Json)[]).filter((draft) => titles.has(draft.image_id)).map(({ image_id: imageId, ...recipe }) => [imageId, JSON.stringify({ ...recipe, title: titles.get(imageId) }), seededAt]));
  for (const row of await select(db, "SELECT id, payload FROM ingredients")) {
    const item = parseJson<{ price_php: number } & Json>(row.payload);
    const rounded = roundPrice(item.price_php);
    if (item.price_php !== rounded) await db.query("UPDATE ingredients SET payload = ? WHERE id = ?", [JSON.stringify({ ...item, price_php: rounded }), row.id]);
  }
  await db.query("DELETE FROM rate_limits WHERE window_ends < ?", [Math.floor(Date.now() / 1000)]);
  const [{ count }] = await select(db, "SELECT COUNT(*) AS count FROM featured_weeks");
  if (Number(count) === 0) {
    const ready = await select(db, "SELECT payload FROM recipes WHERE kind = 'ulam' AND slug IN (?)", [INITIAL_FEATURED]);
    if (ready.length === INITIAL_FEATURED.length && ready.every((row) => parseJson(row.payload).image))
      await db.query("INSERT IGNORE INTO featured_weeks (week_start, slugs_json, updated_at) VALUES (?, ?, ?)", [weekMonday(), JSON.stringify(INITIAL_FEATURED), nowIso()]);
  }
}
