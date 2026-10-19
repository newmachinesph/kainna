import type { DietaryFlag, Dish, ProteinClass } from "@/lib/types";
import { INGREDIENTS, INGREDIENT_BY_ID } from "@/lib/data";
import { buildPriceMap, dishCostPerServing } from "@/lib/costing";
import { qtyLabel, roundToFive } from "@/lib/format";
import { absoluteUrl, publicImageUrl } from "@/lib/site";

export function jsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function recipeBreadcrumbs(name: string, section: string, sectionPath: string, recipePath: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: section, item: absoluteUrl(sectionPath) },
      { "@type": "ListItem", position: 3, name, item: absoluteUrl(recipePath) },
    ],
  };
}

export const PROTEIN_LABEL: Record<ProteinClass, string> = {
  manok: "Chicken", baboy: "Pork", baka: "Beef", isda: "Fish", hipon: "Seafood", itlog: "Egg", gulay: "Vegetable", delata: "Canned goods", pancit: "Noodles",
};

/** Only flags with a clean schema.org RestrictedDiet equivalent. */
const DIET_BY_FLAG: Partial<Record<DietaryFlag, string>> = {
  vegetarian: "https://schema.org/VegetarianDiet",
  low_salt: "https://schema.org/LowSaltDiet",
};

const BASE_PRICES = buildPriceMap(INGREDIENTS);

/** Cost per serving from the seed wet-market price list, the same on server and client. */
export function dishBaseCostPerServing(dish: Dish): number {
  return dishCostPerServing(dish, BASE_PRICES);
}

function organization(): Record<string, unknown> {
  return { "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Kain Na!", url: absoluteUrl("/"), logo: absoluteUrl("/brand/kain-na-logo.svg") };
}

/** Full photo plus the prebuilt thumbnail when the photo lives on the Kain Na! CDN. */
export function recipeImages(image?: string | null): string[] | undefined {
  const full = publicImageUrl(image);
  if (!full) return undefined;
  try {
    const url = new URL(full);
    if (url.hostname === "cdn.kainna.ph" && url.pathname.includes("/full/")) return [full, full.replace("/full/", "/thumbnail/")];
  } catch {
    // Not a parseable URL; keep it as the only image.
  }
  return [full];
}

function keywords(values: Array<string | null | undefined>): string {
  const unique = new Map<string, string>();
  for (const value of values) {
    const text = value?.trim();
    if (text && !unique.has(text.toLowerCase())) unique.set(text.toLowerCase(), text);
  }
  return [...unique.values()].join(", ");
}

type RecipeBase = { url: string; name: string; description: string; image?: string | null; category: string; keywords: Array<string | null | undefined>; minutes: number; servings: number; ingredients: unknown[]; steps: string[] };

function recipeSchema(base: RecipeBase): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Recipe", "@id": `${base.url}#recipe`,
    name: base.name, description: base.description, image: recipeImages(base.image), url: base.url, mainEntityOfPage: base.url,
    inLanguage: "en-PH", recipeCuisine: "Filipino", recipeCategory: base.category, keywords: keywords([...base.keywords, "Filipino recipe"]),
    recipeYield: `${base.servings} servings`, totalTime: `PT${base.minutes}M`, recipeIngredient: base.ingredients,
    recipeInstructions: base.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })),
    author: organization(), publisher: organization(),
  };
}

export function ulamRecipeSchema(dish: Dish): Record<string, unknown> {
  const protein = PROTEIN_LABEL[dish.protein_class];
  const diets = dish.dietary_ok_flags.map((flag) => DIET_BY_FLAG[flag]).filter(Boolean);
  return {
    ...recipeSchema({
      url: absoluteUrl(`/recipes/${dish.slug}`), name: dish.name_tl, description: dish.description_tl, image: dish.image,
      category: "Main course", keywords: [dish.name_tl, dish.name_en, dish.name_ceb, protein && `${protein} ulam`, "ulam"],
      minutes: dish.cook_minutes, servings: dish.servings, steps: dish.steps_short,
      ingredients: dish.ingredients.map(({ ingredient_id, qty, note }) => {
        const ingredient = INGREDIENT_BY_ID.get(ingredient_id);
        return ingredient ? `${qtyLabel(qty, ingredient.unit)} ${ingredient.name_en}${note ? `, ${note}` : ""}` : null;
      }).filter(Boolean),
    }),
    alternateName: dish.name_en,
    estimatedCost: { "@type": "MonetaryAmount", currency: "PHP", value: roundToFive(dishBaseCostPerServing(dish) * dish.servings) },
    ...(diets.length ? { suitableForDiet: diets.length === 1 ? diets[0] : diets } : {}),
  };
}

export type MeriendaRecipe = { slug: string; title: string; image: string; kind?: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };

export function meriendaRecipeSchema(recipe: MeriendaRecipe): Record<string, unknown> {
  return recipeSchema({
    url: absoluteUrl(`/merienda/${recipe.slug}`), name: recipe.title, description: recipe.intro, image: recipe.image,
    category: "Merienda", keywords: [recipe.title, recipe.kind, "merienda", "Filipino snack"],
    minutes: recipe.minutes, servings: recipe.servings, ingredients: recipe.ingredients, steps: recipe.steps,
  });
}

export type CatalogRecipeFields = { intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };

export function catalogRecipeSchema(item: { title: string; category: string; image: string }, recipe: CatalogRecipeFields, path: string): Record<string, unknown> {
  return recipeSchema({
    url: absoluteUrl(path), name: item.title, description: recipe.intro, image: item.image,
    category: item.category, keywords: [item.title, item.category],
    minutes: recipe.minutes, servings: recipe.servings, ingredients: recipe.ingredients, steps: recipe.steps,
  });
}

/** FAQPage for the Quick answers block. It holds no URLs, so it renders the same on server and client. */
export function faqPageSchema(questions: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: questions.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
  };
}
