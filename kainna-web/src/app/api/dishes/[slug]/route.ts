export async function GET(_request: Request, { params }: RouteContext<"/api/dishes/[slug]">) {
  const { slug } = await params;
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/recipes/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return Response.json({ success: response.ok, data: response.ok ? await response.json() : null, error: response.ok ? null : "Recipe not found" }, { status: response.status });
  } catch { return Response.json({ success: false, data: null, error: "Recipe unavailable" }, { status: 503 }); }
}
