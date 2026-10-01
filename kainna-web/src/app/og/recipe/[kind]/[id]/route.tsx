import { ImageResponse } from "next/og";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RecipeCard = { title: string; image: string };

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
  const recipe = await response.json() as RecipeCard & { name_en?: string; name_tl?: string };
  const title = recipe.title ?? recipe.name_en ?? recipe.name_tl ?? "Filipino Recipe";
  if (!recipe.image) return new Response("Image unavailable", { status: 404 });
  const photoResponse = await fetch(recipe.image);
  if (!photoResponse.ok) return new Response("Image unavailable", { status: 503 });
  const photo = await sharp(Buffer.from(await photoResponse.arrayBuffer()))
    .resize(700, 630, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  const photoDataUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;
  const titleSize = title.length > 47 ? 38 : title.length > 29 ? 46 : 58;

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: "#f7f4eb" }}>
      <img src={photoDataUrl} alt="" width={700} height={630} style={{ width: 700, height: 630, objectFit: "cover" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 500, height: 630, padding: "55px 48px", color: "#173d32" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>
          <span style={{ display: "flex", width: 16, height: 16, borderRadius: 16, backgroundColor: "#e3ad33" }} />
          KAIN NA!
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#91722d" }}>Filipino recipe</div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, overflowWrap: "break-word" }}>{title}</div>
          <div style={{ display: "flex", fontSize: 25, lineHeight: 1.3 }}>Ingredients & cooking steps</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#5c7069" }}>kainna.ph</div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
