export async function GET() {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/ingredients`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const data = await response.json() as { items: unknown[]; total: number };
    return Response.json({ success: response.ok, data: data.items ?? [], error: response.ok ? null : data, meta: { total: data.total ?? 0 } }, { status: response.status });
  } catch { return Response.json({ success: false, data: [], error: "Ingredients unavailable" }, { status: 503 }); }
}
