"use client";

import { useEffect, useState } from "react";
import type { FeaturedWeek } from "./HomePlannerPreview";
import { RecipeEditor } from "./RecipeEditor";
import { CatalogRecipeEditor } from "./CatalogRecipeEditor";
import { roundToFive } from "@/lib/format";

const api = "";
type Recipe = { slug: string; name_tl: string; name_en: string; image?: string | null };
type Ingredient = { id: string; name_tl: string; name_en: string; unit: string; price_php: number; price_source: string; price_updated_at: string };
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientId, setIngredientId] = useState("");
  const [price, setPrice] = useState("");
  const [priceSource, setPriceSource] = useState("");
  const [week, setWeek] = useState("");
  const [slugs, setSlugs] = useState<string[]>(Array(7).fill(""));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([fetch(`${api}/v1/featured-week`, { credentials: "include" }), fetch(`${api}/v1/recipes`, { credentials: "include" }), fetch(`${api}/v1/ingredients`)])
      .then(async ([featuredResponse, recipesResponse, ingredientsResponse]) => {
        if (!featuredResponse.ok || !recipesResponse.ok || !ingredientsResponse.ok) throw new Error("Could not load the editor.");
        const featured = await featuredResponse.json() as FeaturedWeek;
        const list = await recipesResponse.json() as { items: Recipe[] };
        const prices = await ingredientsResponse.json() as { items: Ingredient[] };
        setWeek(featured.week_start);
        setSlugs(featured.days.map(item => item.recipe.slug));
        setRecipes(list.items.filter(item => Boolean(item.image)));
        setIngredients(prices.items);
        if (prices.items[0]) { setIngredientId(prices.items[0].id); setPrice(String(roundToFive(prices.items[0].price_php))); setPriceSource(prices.items[0].price_source); }
      }).catch(cause => setMessage(cause.message));
  }, []);
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`${api}/v1/admin/featured-week/${week}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not publish this week.");
      setMessage("Published. The home page now shows these recipes for the selected week.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not publish."); }
    finally { setBusy(false); }
  }
  async function publishPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`${api}/v1/admin/ingredients/${encodeURIComponent(ingredientId)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price_php: roundToFive(Number(price)), price_source: priceSource }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not update price.");
      setIngredients(current => current.map(item => item.id === data.id ? data as Ingredient : item));
      setPrice(String(data.price_php));
      setMessage("Price saved. Plans will use this value when refreshed.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not update price."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl pb-20 pt-10">
    <p className="eyebrow">Kain Na! administration</p>
    <h1 className="section-title mt-3">Featured week</h1>
    <p className="mt-3 max-w-2xl text-ink-soft">Choose seven recipes with available photos. Publish a new Monday each week; the latest published week stays visible until you update it.</p>
    <form onSubmit={publish} className="mt-8 space-y-5">
      <label className="block max-w-xs text-sm font-bold">Week starts Monday<input type="date" required value={week} onChange={event => setWeek(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" /></label>
      <div className="grid gap-3 sm:grid-cols-2">{days.map((day, index) => {
        const recipe = recipes.find(item => item.slug === slugs[index]);
        return <label key={day} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3"><span className="w-20 shrink-0 font-bold">{day}</span>{recipe?.image && <img src={recipe.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}<select required className="min-w-0 flex-1 rounded-lg border border-line bg-paper p-2 text-sm" value={slugs[index]} onChange={event => setSlugs(current => current.map((value, slot) => slot === index ? event.target.value : value))}><option value="">Choose a recipe</option>{recipes.map(item => <option key={item.slug} value={item.slug}>{item.name_tl} · {item.name_en}</option>)}</select></label>;
      })}</div>
      {message && <p role="status" className="rounded-xl bg-accent-soft p-3 text-sm">{message}</p>}
      <button type="submit" disabled={busy || !week || slugs.some(slug => !slug)} className="brand-button">{busy ? "Publishing…" : "Publish featured week"}</button>
    </form>
    <form onSubmit={publishPrice} className="mt-12 rounded-2xl border border-line bg-card p-5 md:p-7">
      <p className="eyebrow">Market prices</p><h2 className="mt-2 text-2xl font-bold">Update an ingredient</h2>
      <p className="mt-2 text-sm text-muted">These prices are estimates until reviewed. Enter the amount per listed unit and record where it came from.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Ingredient<select className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" value={ingredientId} onChange={event => { const item = ingredients.find(entry => entry.id === event.target.value); if (item) { setIngredientId(item.id); setPrice(String(roundToFive(item.price_php))); setPriceSource(item.price_source); } }}>{ingredients.map(item => <option key={item.id} value={item.id}>{item.name_en} · {item.unit}</option>)}</select></label><label className="text-sm font-bold">Price (₱, rounded to 5)<input className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" type="number" min="5" step="5" required value={price} onChange={event => setPrice(event.target.value)} onBlur={() => { if (Number(price) > 0) setPrice(String(roundToFive(Number(price)))); }} /></label><label className="text-sm font-bold">Source<input className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" required minLength={2} maxLength={120} value={priceSource} onChange={event => setPriceSource(event.target.value)} /></label></div>
      <button type="submit" disabled={busy || !ingredientId} className="brand-button mt-5">Save price</button>
      {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
    </form>
    <RecipeEditor />
    <CatalogRecipeEditor />
  </div>;
}
