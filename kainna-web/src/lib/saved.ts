const GUEST_SAVED_KEY = "salosalo-guest-saved-v1";

function guestSlugs(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_SAVED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === "string") : [];
  } catch { return []; }
}

export async function savedSlugs(): Promise<string[]> {
  const response = await fetch("/api/saved", { cache: "no-store" });
  if (response.status === 401) return guestSlugs();
  if (!response.ok) throw new Error("Saved recipes unavailable");
  const data = await response.json() as { items: { slug: string }[] };
  return data.items.map(item => item.slug);
}

export async function guestSavedItems<T extends { slug: string }>(): Promise<T[]> {
  const base = "";
  const results = await Promise.all(guestSlugs().map(async slug => {
    const ulam = await fetch(`${base}/v1/recipes/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const response = ulam.ok ? ulam : await fetch(`${base}/v1/merienda/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  }));
  return results.filter(item => item !== null) as T[];
}

export async function setSaved(slug: string, saved: boolean): Promise<boolean> {
  const response = await fetch(`/api/saved${saved ? "" : `?slug=${encodeURIComponent(slug)}`}`, {
    method: saved ? "PUT" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: saved ? JSON.stringify({ recipe_slug: slug }) : undefined,
  });
  if (response.status === 401) {
    const current = new Set(guestSlugs());
    if (saved) current.add(slug); else current.delete(slug);
    localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify([...current]));
  } else if (!response.ok) throw new Error("Could not update saved recipes");
  window.dispatchEvent(new Event("salosalo:saved"));
  return true;
}
