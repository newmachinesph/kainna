"use client";
import { useEffect, useState } from "react";

type Recipe = { slug: string; name_tl: string; name_en: string; description_tl: string; cook_minutes: number; steps_short: string[]; image?: string };
const api = "";

export function RecipeEditor() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [slug, setSlug] = useState("");
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${api}/v1/recipes`, { cache: "no-store" }).then(response => response.json()).then((data: { items: Recipe[] }) => { setRecipes(data.items); if (data.items[0]) { setSlug(data.items[0].slug); setDraft(data.items[0]); } }).catch(() => setMessage("Recipes unavailable.")); }, []);
  function select(next: string) { setSlug(next); setDraft(recipes.find(item => item.slug === next) ?? null); setMessage(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return; setBusy(true); setMessage("");
    try {
      const response = await fetch(`${api}/v1/admin/recipes/${encodeURIComponent(slug)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name_tl: draft.name_tl, name_en: draft.name_en, description_tl: draft.description_tl, cook_minutes: draft.cook_minutes, steps_short: draft.steps_short }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not save recipe.");
      setRecipes(current => current.map(item => item.slug === slug ? data as Recipe : item));
      setDraft(data as Recipe); setMessage("Recipe saved. It is now available in the catalog and planner.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save recipe."); }
    finally { setBusy(false); }
  }
  return <section className="mt-12 rounded-2xl border border-line bg-card p-5 md:p-7"><p className="eyebrow">Recipe library</p><h2 className="mt-2 text-2xl font-bold">Edit cooking steps</h2><p className="mt-2 text-sm text-muted">Updates are saved to the database and appear on recipe pages and in the planner.</p>
    <label className="mt-5 block text-sm font-bold">Recipe<select value={slug} onChange={event => select(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal"><option value="">Choose a recipe</option>{recipes.map(item => <option key={item.slug} value={item.slug}>{item.name_tl}</option>)}</select></label>
    {draft && <form onSubmit={save} className="mt-5 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Filipino name<input required minLength={2} maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" value={draft.name_tl} onChange={event => setDraft({ ...draft, name_tl: event.target.value })} /></label><label className="text-sm font-bold">English name<input required minLength={2} maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" value={draft.name_en} onChange={event => setDraft({ ...draft, name_en: event.target.value })} /></label></div><label className="text-sm font-bold">Description<textarea required minLength={10} maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-normal" value={draft.description_tl} onChange={event => setDraft({ ...draft, description_tl: event.target.value })} /></label><label className="text-sm font-bold">Cook time (minutes)<input type="number" required min={1} max={1440} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" value={draft.cook_minutes} onChange={event => setDraft({ ...draft, cook_minutes: Number(event.target.value) })} /></label><label className="text-sm font-bold">Steps, one per line<textarea required rows={8} className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-normal" value={draft.steps_short.join("\n")} onChange={event => setDraft({ ...draft, steps_short: event.target.value.split("\n") })} /></label><button type="submit" className="brand-button w-fit" disabled={busy}>{busy ? "Saving…" : "Save recipe"}</button></form>}
    {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
  </section>;
}
