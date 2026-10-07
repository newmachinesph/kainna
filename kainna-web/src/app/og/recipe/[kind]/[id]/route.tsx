import { ImageResponse } from "next/og";
import sharp from "sharp";
import { OG, Wordmark, ogFonts, ogMark } from "@/lib/og";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RecipeCard = { title?: string; name_en?: string; name_tl?: string; image: string; category?: string; cook_minutes?: number; minutes?: number; servings?: number };

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const path = kind === "ulam" ? `/v1/recipes/${encodeURIComponent(id)}`
    : kind === "merienda" ? `/v1/merienda/${encodeURIComponent(id)}`
      : kind === "catalog" ? `/v1/catalog/${encodeURIComponent(id)}` : null;
  if (!path) return new Response("Not found", { status: 404 });

  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${base}${path}`, { cache: "no-store" });
  if (response.status === 404) return new Response("Not found", { status: 404 });
  if (!response.ok) return new Response("Recipe unavailable", { status: 503 });
  const recipe = await response.json() as RecipeCard & { catalog_recipe?: { minutes: number; servings: number } | null };
  const title = recipe.title ?? recipe.name_en ?? recipe.name_tl ?? "Filipino Recipe";
  const subtitle = recipe.name_tl && recipe.name_tl !== title ? recipe.name_tl : null;
  const minutes = recipe.cook_minutes ?? recipe.minutes ?? recipe.catalog_recipe?.minutes;
  const servings = recipe.servings ?? recipe.catalog_recipe?.servings;
  const facts = [minutes && `${minutes} min`, servings && `Serves ${servings}`].filter(Boolean).join("  ·  ");
  if (!recipe.image) return new Response("Image unavailable", { status: 404 });
  const photoResponse = await fetch(recipe.image, { signal: AbortSignal.timeout(8000) });
  if (!photoResponse.ok) return new Response("Image unavailable", { status: 503 });
  const [photo, fonts, mark] = await Promise.all([
    sharp(Buffer.from(await photoResponse.arrayBuffer())).resize(660, 630, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer(),
    ogFonts().catch(() => []),
    ogMark(),
  ]);
  const photoDataUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;
  const titleSize = title.length > 44 ? 40 : title.length > 28 ? 50 : 62;

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: OG.paper, fontFamily: "DM Sans" }}>
      <img src={photoDataUrl} alt="" width={660} height={630} style={{ width: 660, height: 630, objectFit: "cover" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 540, height: 630, padding: "48px 52px 44px", color: OG.ink, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 540, height: 12, backgroundColor: OG.mustard, display: "flex" }} />
        <Wordmark mark={mark} size={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 17, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: OG.accent }}>{recipe.category ? `${recipe.category}  ·  Filipino recipe` : "Filipino recipe"}</div>
          <div style={{ display: "flex", fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: titleSize, lineHeight: 1.04, letterSpacing: "-0.02em", overflowWrap: "break-word" }}>{title}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 24, color: OG.inkSoft }}>{subtitle}</div>}
          {facts && <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: OG.ink }}>{facts}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 20, color: OG.muted }}>
          <span>Ingredients &amp; cooking steps</span>
          <span style={{ fontWeight: 700, color: OG.ink }}>kainna.ph</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
