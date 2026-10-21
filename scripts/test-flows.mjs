// Integration check for household seats, roles, saved recipes, weekly publishing and admin edits.
// Run against a server on an empty database, since the first account becomes the site admin:
//   BASE_URL=http://localhost:3000 node scripts/test-flows.mjs
import assert from "node:assert/strict";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const run = Date.now().toString(36);

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { cookie: `salosalo_session=${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("salosalo_session="));
  return { status: response.status, data, token: cookie?.split(";")[0].split("=")[1] };
}

async function ok(method, path, options) {
  const result = await call(method, path, options);
  assert.ok(result.status < 300, `${method} ${path} -> ${result.status} ${JSON.stringify(result.data)}`);
  return result;
}

async function rejected(method, path, status, options) {
  const result = await call(method, path, options);
  assert.equal(result.status, status, `${method} ${path} expected ${status}, got ${result.status} ${JSON.stringify(result.data)}`);
}

async function newUser(email, name, household, code) {
  const result = await ok("POST", "/v1/auth/register", { body: { email, password: "correct horse battery staple", display_name: name, household_name: household, invite_code: code } });
  assert.equal(result.status, 201);
  const me = await ok("GET", "/v1/auth/me", { token: result.token });
  assert.equal(me.data.user.id, result.data.user.id);
  return { user: result.data.user, token: result.token };
}

const health = await ok("GET", "/health");
assert.ok(health.data.catalog_images > 1000 && health.data.ulam_recipes > 50);
const owner = await newUser(`owner-${run}@example.com`, "Owner", "Test family");
assert.ok(owner.user.role === "owner" && owner.user.is_site_admin, "first account must be owner and site admin");
assert.equal((await ok("GET", "/v1/household/members", { token: owner.token })).data.max_accounts, 3);
const code1 = (await ok("POST", "/v1/household/invitations", { token: owner.token, body: { email: `one-${run}@example.com` } })).data.invite_code;
const code2 = (await ok("POST", "/v1/household/invitations", { token: owner.token, body: { email: `two-${run}@example.com` } })).data.invite_code;
await rejected("POST", "/v1/household/invitations", 409, { token: owner.token, body: { email: `three-${run}@example.com` } });
const first = await newUser(`one-${run}@example.com`, "First", null, code1);
const second = await newUser(`two-${run}@example.com`, "Second", null, code2);
assert.equal((await ok("GET", "/v1/household/members", { token: owner.token })).data.members.length, 3);
await rejected("POST", "/v1/household/invitations", 403, { token: first.token, body: { email: `x-${run}@example.com` } });
await rejected("POST", "/v1/auth/register", 400, { body: { email: `uninvited-${run}@example.com`, password: "correct horse battery staple", display_name: "No", invite_code: "wrong" } });
await rejected("POST", "/v1/auth/login", 401, { body: { email: `owner-${run}@example.com`, password: "wrong password here" } });
assert.ok((await ok("POST", "/v1/auth/login", { body: { email: `owner-${run}@example.com`, password: "correct horse battery staple" } })).token);
assert.equal((await ok("GET", "/v1/household/state", { token: owner.token })).data.state, null);
await ok("PUT", "/v1/household/state", { token: first.token, body: { state: { plan: { id: "plan-one" }, ignored: true } } });
const state = (await ok("GET", "/v1/household/state", { token: owner.token })).data.state;
assert.ok(state.plan.id === "plan-one" && !("ignored" in state));
await ok("PUT", "/v1/me/saved", { token: first.token, body: { recipe_slug: "sarciadong-isda" } });
await rejected("PUT", "/v1/me/saved", 400, { token: first.token, body: { recipe_slug: "not-a-recipe" } });
assert.equal((await ok("GET", "/v1/me/saved", { token: first.token })).data.items.length, 1);
assert.equal((await ok("GET", "/v1/me/saved", { token: second.token })).data.items.length, 0);
const slugs = ["chicken-adobo", "tortang-talong", "sinigang-na-baboy", "sarciadong-isda", "ginisang-monggo", "tinolang-manok", "bicol-express"];
const week = (await ok("GET", "/v1/featured-week")).data.week_start;
const published = (await ok("PUT", `/v1/admin/featured-week/${week}`, { token: owner.token, body: { slugs } })).data;
assert.ok(published.days.length === 7 && published.days[3].recipe.image.startsWith("https://"));
await rejected("PUT", `/v1/admin/featured-week/${week}`, 400, { token: owner.token, body: { slugs: Array(7).fill("chicken-adobo") } });
await rejected("PUT", `/v1/admin/featured-week/${week}`, 403, { token: first.token, body: { slugs } });
const ingredients = (await ok("GET", "/v1/ingredients")).data.items;
assert.ok(ingredients.every((item) => item.price_php % 5 === 0));
const updated = (await ok("PUT", `/v1/admin/ingredients/${encodeURIComponent(ingredients[0].id)}`, { token: owner.token, body: { price_php: ingredients[0].price_php + 3, price_source: "Test market survey" } })).data;
assert.equal(updated.price_php, ingredients[0].price_php + 5);
const dish = (await ok("GET", "/v1/recipes/sarciadong-isda")).data;
await ok("PUT", `/v1/admin/recipes/${dish.slug}`, { token: owner.token, body: { name_tl: dish.name_tl, name_en: dish.name_en, description_tl: "Tested recipe description stored in MySQL.", cook_minutes: dish.cook_minutes, steps_short: ["Prepare the ingredients.", "Cook until done."] } });
assert.equal((await ok("GET", "/v1/recipes/sarciadong-isda")).data.description_tl, "Tested recipe description stored in MySQL.");
await ok("PUT", `/v1/admin/recipes/${dish.slug}`, { token: owner.token, body: { name_tl: dish.name_tl, name_en: dish.name_en, description_tl: dish.description_tl, cook_minutes: dish.cook_minutes, steps_short: dish.steps_short } });
await ok("PUT", `/v1/admin/ingredients/${encodeURIComponent(ingredients[0].id)}`, { token: owner.token, body: { price_php: ingredients[0].price_php, price_source: ingredients[0].price_source } });
const catalog = (await ok("GET", "/v1/catalog?limit=3&recipes_only=true&rotate=daily")).data;
assert.ok(catalog.items.length === 3 && catalog.total > 1000);
const item = catalog.items[0];
assert.equal((await ok("GET", `/v1/catalog/slug/${item.id.split("__")[1]}`)).data.id, item.id);
await rejected("GET", "/v1/catalog?limit=500", 422);
await rejected("GET", "/v1/recipes/not-a-recipe", 404);
await rejected("GET", "/v1/admin/catalog/recipe-queue", 401);
await ok("GET", "/v1/admin/catalog/recipe-queue?limit=5", { token: owner.token });
await ok("DELETE", `/v1/household/members/${first.user.id}`, { token: owner.token });
assert.equal((await ok("GET", "/v1/household/members", { token: owner.token })).data.members.length, 2);
await rejected("GET", "/v1/auth/me", 401, { token: first.token });
await ok("POST", "/v1/auth/logout", { token: second.token });
await rejected("GET", "/v1/auth/me", 401, { token: second.token });
for (const page of ["/", "/recipes", "/merienda", "/recipes/chicken-adobo", `/recipes/${item.id.split("__")[1]}`, "/sitemap.xml", "/api/catalog?limit=2"]) {
  const response = await fetch(`${base}${page}`);
  assert.equal(response.status, 200, `${page} -> ${response.status}`);
}
console.log("PASS: owner, two-member limit, invitations, login, shared state, isolated saves, featured week, admin edits, catalog, removal, logout, pages");
