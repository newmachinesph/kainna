// Validates src/data/dishes.json against src/data/ingredients.json and the
// Dish type in src/lib/types.ts. Run: node scripts/validate-dishes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dishes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/dishes.json"), "utf8"));
const ingredients = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/ingredients.json"), "utf8"));

const EXPECTED_COUNT = 73;
const SERVINGS = 4;
const COST_TOLERANCE = 1;
const MIN_INGREDIENTS = 5;
const MAX_INGREDIENTS = 9;
const MIN_STEPS = 4;
const MAX_STEPS = 6;
const MAX_DESCRIPTION_CHARS = 140;
const FORBIDDEN_PHRASE = /ano'ng ulam\?/i;

const PROTEIN_CLASSES = new Set(["manok","baboy","baka","isda","hipon","itlog","gulay","delata","pancit"]);
const DIETARY_FLAGS = new Set(["no_pork","no_beef","no_seafood","no_shellfish","vegetarian","low_salt","diabetic","no_coconut"]);

const price = new Map(ingredients.map((i) => [i.id, i.price_php]));
const errors = [];
const fail = (msg) => errors.push(msg);

if (!Array.isArray(dishes)) fail("dishes.json is not an array");
if (dishes.length !== EXPECTED_COUNT) fail(`expected ${EXPECTED_COUNT} dishes, got ${dishes.length}`);

const ids = new Set();
const slugs = new Set();
for (const d of dishes) {
  if (ids.has(d.id)) fail(`${d.slug}: duplicate id ${d.id}`);
  if (slugs.has(d.slug)) fail(`${d.slug}: duplicate slug`);
  ids.add(d.id);
  slugs.add(d.slug);
}

dishes.forEach((d, i) => {
  const tag = d.slug ?? `#${i}`;
  const expectedId = `d${String(i + 1).padStart(3, "0")}`;
  if (d.id !== expectedId) fail(`${tag}: id ${d.id} should be ${expectedId}`);

  for (const key of ["name_tl","name_en","name_ceb","description_tl"]) {
    if (typeof d[key] !== "string" || d[key].length === 0) fail(`${tag}: missing ${key}`);
  }
  if (!PROTEIN_CLASSES.has(d.protein_class)) fail(`${tag}: invalid protein_class ${d.protein_class}`);
  if (!Number.isInteger(d.cook_minutes) || d.cook_minutes <= 0) fail(`${tag}: invalid cook_minutes`);
  if (d.servings !== SERVINGS) fail(`${tag}: servings should be ${SERVINGS}`);
  if (!Number.isInteger(d.leftover_yield) || d.leftover_yield < 1) fail(`${tag}: invalid leftover_yield`);

  if (!Array.isArray(d.dietary_ok_flags)) fail(`${tag}: dietary_ok_flags missing`);
  else for (const f of d.dietary_ok_flags) if (!DIETARY_FLAGS.has(f)) fail(`${tag}: invalid flag ${f}`);

  if (d.derived_slug !== undefined && !slugs.has(d.derived_slug)) fail(`${tag}: derived_slug ${d.derived_slug} not found`);
  if (d.leftover_yield > 1 && !d.derived_slug) fail(`${tag}: leftover_yield > 1 without derived_slug`);

  if (!Array.isArray(d.ingredients)) { fail(`${tag}: ingredients missing`); return; }
  if (d.ingredients.length < MIN_INGREDIENTS || d.ingredients.length > MAX_INGREDIENTS) {
    fail(`${tag}: ${d.ingredients.length} ingredients (want ${MIN_INGREDIENTS}-${MAX_INGREDIENTS})`);
  }
  let total = 0;
  const seen = new Set();
  for (const ing of d.ingredients) {
    if (!price.has(ing.ingredient_id)) { fail(`${tag}: unknown ingredient ${ing.ingredient_id}`); continue; }
    if (seen.has(ing.ingredient_id)) fail(`${tag}: duplicate ingredient ${ing.ingredient_id}`);
    seen.add(ing.ingredient_id);
    if (typeof ing.qty !== "number" || ing.qty <= 0) fail(`${tag}: bad qty for ${ing.ingredient_id}`);
    total += ing.qty * price.get(ing.ingredient_id);
  }
  const computed = Math.round(total / SERVINGS);
  if (Math.abs(d.base_cost_per_serving - computed) > COST_TOLERANCE) {
    fail(`${tag}: base_cost_per_serving ${d.base_cost_per_serving} != computed ${computed}`);
  }

  if (!Array.isArray(d.steps_short) || d.steps_short.length < MIN_STEPS || d.steps_short.length > MAX_STEPS) {
    fail(`${tag}: steps_short should have ${MIN_STEPS}-${MAX_STEPS} entries`);
  }
  const text = [d.description_tl, ...(d.steps_short ?? [])].join(" ");
  if (FORBIDDEN_PHRASE.test(text)) fail(`${tag}: contains forbidden phrase`);
  if (typeof d.description_tl === "string" && d.description_tl.length > MAX_DESCRIPTION_CHARS) {
    fail(`${tag}: description_tl is ${d.description_tl.length} chars (max ${MAX_DESCRIPTION_CHARS})`);
  }

  if (d.image !== null && typeof d.image !== "string") fail(`${tag}: image must be string or null`);
});

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const costs = dishes.map((d) => d.base_cost_per_serving).sort((a, b) => a - b);
const median = costs.length % 2 === 1
  ? costs[(costs.length - 1) / 2]
  : (costs[costs.length / 2 - 1] + costs[costs.length / 2]) / 2;
console.log(`OK: ${dishes.length} dishes validated`);
console.log(`cost per serving  min ${costs[0]}  median ${median}  max ${costs[costs.length - 1]}`);
