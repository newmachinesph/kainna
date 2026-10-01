export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/catalog?${query}`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    return Response.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Food catalog is unavailable" }, { status: 503 });
  }
}
