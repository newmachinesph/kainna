"use client";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { savedSlugs, setSaved } from "@/lib/saved";

export function SaveRecipeButton({ slug }: { slug: string }) {
  const [saved, update] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; savedSlugs().then(slugs => { if (active) update(slugs.includes(slug)); }).catch(() => undefined); return () => { active = false; }; }, [slug]);
  async function toggle() { setBusy(true); try { if (await setSaved(slug, !saved)) update(!saved); } finally { setBusy(false); } }
  return <button type="button" aria-pressed={saved} disabled={busy} onClick={toggle} className="brand-button-outline gap-2">{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? "Saved" : "Save recipe"}</button>;
}
