import type { Metadata } from "next";
import Link from "next/link";
import { foodHref } from "@/lib/catalog-urls";
import { recipeBreadcrumbs, jsonLd } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
const description = "Every Filipino dish in the Kain Na! collection, sorted A to Z. Dishes marked with a dot have a full recipe with ingredients and cooking steps.";

export const metadata: Metadata = {
  title: "All Filipino Dishes A–Z",
  description,
  alternates: { canonical: "/recipes/a-z" },
  openGraph: { title: "All Filipino Dishes A–Z | Kain Na!", description, url: absoluteUrl("/recipes/a-z"), type: "website" },
};

type Item = { id: string; title: string; recipe_slug: string | null; merienda_slug: string | null; recipe: object | null };

async function loadAll(): Promise<Item[]> {
  const response = await fetch(`${API}/v1/seo-catalog`, { cache: "no-store" });
  if (!response.ok) throw new Error("Food catalog unavailable");
  return (await response.json() as { items: Item[] }).items;
}

function letterOf(title: string): string {
  const letter = title.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}

export default async function Page() {
  const items = await loadAll();
  const groups = new Map<string, Item[]>();
  for (const item of [...items].sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))) {
    const letter = letterOf(item.title);
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  const letters = [...groups.keys()].sort((a, b) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)));
  const withRecipe = items.filter((item) => item.recipe_slug || item.merienda_slug || item.recipe).length;

  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs("All dishes A–Z", "Recipes", "/recipes", "/recipes/a-z")) }} />
      <div className="border-b border-line py-10 md:py-14">
        <p className="eyebrow">The Kain Na! food collection</p>
        <h1 className="section-title mt-3">All Filipino dishes, A to Z</h1>
        <p className="mt-4 max-w-[60ch] text-ink-soft">{items.length.toLocaleString()} dishes, {withRecipe.toLocaleString()} of them with a full recipe. Dishes marked with a dot have ingredients and cooking steps. To browse with photos, go to <Link href="/recipes" className="text-link">the recipe collection</Link>.</p>
      </div>
      <nav aria-label="Jump to letter" className="sticky top-16 z-20 -mx-4 flex flex-wrap gap-1.5 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur md:top-20 md:-mx-8 md:px-8">
        {letters.map((letter) => <a key={letter} href={`#letter-${letter === "#" ? "num" : letter}`} className="min-w-8 rounded-full border border-line bg-card px-2.5 py-1 text-center text-[13px] font-bold hover:border-ink">{letter}</a>)}
      </nav>
      {letters.map((letter) => (
        <section key={letter} id={`letter-${letter === "#" ? "num" : letter}`} className="scroll-mt-40 border-b border-line py-8">
          <h2 className="text-[28px] font-bold">{letter}</h2>
          <ul className="mt-4 columns-1 gap-8 text-[15px] sm:columns-2 lg:columns-3">
            {groups.get(letter)!.map((item) => {
              const hasRecipe = Boolean(item.recipe_slug || item.merienda_slug || item.recipe);
              return <li key={item.id} className="break-inside-avoid py-1"><Link href={foodHref(item)} prefetch={false} className="hover:text-accent hover:underline">{item.title}</Link>{hasRecipe && <span className="ml-1.5 text-accent" title="Full recipe with ingredients and steps"><span aria-hidden="true">•</span><span className="sr-only">(full recipe)</span></span>}</li>;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
