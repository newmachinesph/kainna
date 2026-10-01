import type { Dish } from "@/lib/types";
import { INGREDIENT_BY_ID } from "@/lib/data";
import { qtyLabel } from "@/lib/format";
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

export function ulamRecipeSchema(dish: Dish): Record<string, unknown> {
  const url = absoluteUrl(`/recipes/${dish.slug}`);
  return {
    "@context": "https://schema.org", "@type": "Recipe", "@id": `${url}#recipe`,
    name: dish.name_tl, alternateName: dish.name_en, description: dish.description_tl,
    image: publicImageUrl(dish.image), url, mainEntityOfPage: url, inLanguage: "en-PH", recipeCuisine: "Filipino",
    recipeYield: `${dish.servings} servings`, totalTime: `PT${dish.cook_minutes}M`,
    recipeIngredient: dish.ingredients.map(({ ingredient_id, qty, note }) => {
      const ingredient = INGREDIENT_BY_ID.get(ingredient_id);
      return ingredient ? `${qtyLabel(qty, ingredient.unit)} ${ingredient.name_en}${note ? `, ${note}` : ""}` : null;
    }).filter(Boolean),
    recipeInstructions: dish.steps_short.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })),
    author: { "@type": "Organization", name: "Kain Na!", url: absoluteUrl("/") },
  };
}

export function meriendaRecipeSchema(recipe: { slug: string; title: string; image: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] }): Record<string, unknown> {
  const url = absoluteUrl(`/merienda/${recipe.slug}`);
  return {
    "@context": "https://schema.org", "@type": "Recipe", "@id": `${url}#recipe`,
    name: recipe.title, description: recipe.intro, image: publicImageUrl(recipe.image), url, mainEntityOfPage: url,
    inLanguage: "en-PH", recipeCuisine: "Filipino", recipeYield: `${recipe.servings} servings`,
    totalTime: `PT${recipe.minutes}M`, recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })),
    author: { "@type": "Organization", name: "Kain Na!", url: absoluteUrl("/") },
  };
}
