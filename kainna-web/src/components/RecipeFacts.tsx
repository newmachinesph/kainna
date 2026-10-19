import type { Dish, ProteinClass } from "@/lib/types";
import { DISH_BY_SLUG, INGREDIENT_BY_ID, PRICE_DATE } from "@/lib/data";
import { peso } from "@/lib/format";
import { dishBaseCostPerServing, faqPageSchema, jsonLd, type CatalogRecipeFields, type MeriendaRecipe } from "@/lib/structured-data";

export type QuickAnswer = { question: string; answer: string };
export type RecipeFactsData = { summary: string; facts: Array<{ label: string; value: string }>; answers: QuickAnswer[] };

const MAX_LISTED_INGREDIENTS = 5;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ULAM_KIND: Record<ProteinClass, string> = {
  manok: "chicken ulam", baboy: "pork ulam", baka: "beef ulam", isda: "fish ulam", hipon: "seafood ulam", itlog: "egg ulam", gulay: "vegetable ulam", delata: "ulam made with canned goods", pancit: "noodle dish",
};

const CATEGORY_NOUN: Record<string, string> = {
  "Chicken": "chicken", "Pork & beef": "pork and beef", "Seafood": "seafood", "Vegetables": "vegetable", "Rice & noodles": "rice and noodle", "Desserts": "dessert", "Drinks": "drink", "More ulam": "ulam",
};

export function categoryNoun(category: string): string {
  return CATEGORY_NOUN[category] ?? category.toLowerCase();
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  return [
    days && `${days} ${days === 1 ? "day" : "days"}`,
    hours && `${hours} ${hours === 1 ? "hour" : "hours"}`,
    remainingMinutes && `${remainingMinutes} minutes`,
  ].filter(Boolean).join(" ");
}

function listPhrase(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "";
}

function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Freshly ground black pepper, to taste" -> "freshly ground black pepper". */
function shortIngredient(line: string): string {
  const head = line.split(/,(?![^(]*\))/)[0].trim();
  return /^[A-Z][a-z]/.test(head) ? head.charAt(0).toLowerCase() + head.slice(1) : head;
}

function ingredientsAnswer(names: string[]): string {
  if (names.length <= MAX_LISTED_INGREDIENTS) return `You need ${listPhrase(names)}.`;
  return `You need ${names.length} ingredients, led by ${listPhrase(names.slice(0, MAX_LISTED_INGREDIENTS))}.`;
}

function timeAnswer(minutes: number, steps: number, servings: number): string {
  return `About ${formatDuration(minutes)}. The recipe has ${steps} ${steps === 1 ? "step" : "steps"} and makes ${servings} servings.`;
}

function priceMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : date;
}

/** The page passes the cost and price date it shows in its header, so both agree. */
export function ulamFacts(dish: Dish, costPerServing?: number, priceDate: string = PRICE_DATE): RecipeFactsData {
  const name = dish.name_tl;
  const alt = dish.name_en && dish.name_en.toLowerCase() !== name.toLowerCase() ? ` (${dish.name_en})` : "";
  const kind = ULAM_KIND[dish.protein_class] ?? "ulam";
  const perServing = costPerServing ?? dishBaseCostPerServing(dish);
  const ingredients = dish.ingredients.map(({ ingredient_id }) => INGREDIENT_BY_ID.get(ingredient_id)).filter((ingredient) => ingredient !== undefined)
    .map((ingredient) => ingredient.name_en.toLowerCase() === ingredient.name_tl.toLowerCase() ? ingredient.name_tl.toLowerCase() : `${ingredient.name_tl.toLowerCase()} (${ingredient.name_en.toLowerCase()})`);
  const derived = dish.derived_slug ? DISH_BY_SLUG.get(dish.derived_slug) : undefined;
  const answers: QuickAnswer[] = [
    { question: `How long does it take to cook ${name}?`, answer: timeAnswer(dish.cook_minutes, dish.steps_short.length, dish.servings) },
    { question: `What do I need for ${name}?`, answer: ingredientsAnswer(ingredients) },
    { question: `How much does ${name} cost to make?`, answer: `About ${peso(perServing * dish.servings)} for ${dish.servings} servings, or ${peso(perServing)} per serving. This uses our wet-market price list from ${priceMonth(priceDate)}.` },
  ];
  if (derived) answers.push({ question: `What can I make with leftover ${name}?`, answer: `Turn the leftovers into ${derived.name_tl} the next day.` });
  return {
    summary: `${name}${alt} is ${article(`Filipino ${kind}`)}. It takes about ${formatDuration(dish.cook_minutes)} to cook and serves ${dish.servings}.`,
    facts: [
      { label: "Cook time", value: formatDuration(dish.cook_minutes) },
      { label: "Serves", value: String(dish.servings) },
      { label: "Category", value: capitalize(kind) },
      { label: "Estimated cost", value: `About ${peso(perServing)} per serving, based on wet-market prices` },
    ],
    answers,
  };
}

function writtenRecipeFacts(name: string, minutes: number, servings: number, ingredients: string[], steps: string[], verb: "cook" | "make"): QuickAnswer[] {
  return [
    { question: `How long does it take to ${verb} ${name}?`, answer: timeAnswer(minutes, steps.length, servings) },
    { question: `What do I need for ${name}?`, answer: ingredientsAnswer(ingredients.map(shortIngredient).filter(Boolean)) },
    ...(steps[0] ? [{ question: `How do you ${verb} ${name}?`, answer: `Start like this: ${steps[0]} There are ${steps.length} ${steps.length === 1 ? "step" : "steps"} in all.` }] : []),
  ];
}

export function meriendaFacts(recipe: MeriendaRecipe): RecipeFactsData {
  const alt = recipe.kind && recipe.kind.toLowerCase() !== recipe.title.toLowerCase() ? ` (${recipe.kind.toLowerCase()})` : "";
  return {
    summary: `${recipe.title}${alt} is a Filipino merienda. It takes about ${formatDuration(recipe.minutes)} to make and serves ${recipe.servings}.`,
    facts: [
      { label: "Time", value: formatDuration(recipe.minutes) },
      { label: "Serves", value: String(recipe.servings) },
      { label: "Category", value: "Merienda" },
    ],
    answers: writtenRecipeFacts(recipe.title, recipe.minutes, recipe.servings, recipe.ingredients, recipe.steps, "make"),
  };
}

export function catalogFacts(item: { title: string; category: string }, recipe: CatalogRecipeFields): RecipeFactsData {
  const verb = item.category === "Desserts" || item.category === "Drinks" ? "make" : "cook";
  const noun = categoryNoun(item.category);
  return {
    summary: `${item.title} takes about ${formatDuration(recipe.minutes)} to ${verb} and serves ${recipe.servings}. It is one of our Filipino ${noun} recipes, with ${recipe.ingredients.length} ingredients and ${recipe.steps.length} steps.`,
    facts: [
      { label: verb === "cook" ? "Cook time" : "Time", value: formatDuration(recipe.minutes) },
      { label: "Serves", value: String(recipe.servings) },
      { label: "Category", value: item.category },
    ],
    answers: writtenRecipeFacts(item.title, recipe.minutes, recipe.servings, recipe.ingredients, recipe.steps, verb),
  };
}

/** Answer-first summary near the top of a recipe page. No hooks, so it renders inside server and client trees alike. */
export function RecipeFacts({ data, className = "mt-10" }: { data: RecipeFactsData; className?: string }) {
  return (
    <section aria-labelledby="at-a-glance" className={`${className} rounded-[18px] border border-line bg-card p-5 md:p-6`}>
      <h2 id="at-a-glance" className="eyebrow">At a glance</h2>
      <p className="mt-3 max-w-[70ch] text-[16px] leading-relaxed">{data.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        {data.facts.map((fact) => <div key={fact.label}><dt className="text-muted">{fact.label}</dt><dd className="mt-0.5 font-semibold">{fact.value}</dd></div>)}
      </dl>
    </section>
  );
}

/** Short Q&As built from the recipe data, with matching FAQPage JSON-LD. */
export function QuickAnswers({ answers, className = "mt-12" }: { answers: QuickAnswer[]; className?: string }) {
  if (!answers.length) return null;
  return (
    <section aria-labelledby="quick-answers" className={className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(answers)) }} />
      <h2 id="quick-answers" className="text-2xl font-bold">Quick answers</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {answers.map((item) => <div key={item.question} className="rounded-xl border border-line bg-card p-4"><h3 className="text-[15px] font-semibold">{item.question}</h3><p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.answer}</p></div>)}
      </div>
    </section>
  );
}
