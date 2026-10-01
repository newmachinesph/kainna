const base = () => process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

async function forward(request: Request, method: "GET" | "PUT" | "DELETE") {
  const slug = new URL(request.url).searchParams.get("slug");
  if (method === "DELETE" && (!slug || !/^[a-z0-9-]+$/.test(slug))) return Response.json({ error: "Invalid recipe" }, { status: 400 });
  try {
    const response = await fetch(`${base()}/v1/me/saved${method === "DELETE" ? `/${slug}` : ""}`, {
      method,
      headers: { cookie: request.headers.get("cookie") ?? "", ...(method === "PUT" ? { "Content-Type": "application/json" } : {}) },
      body: method === "PUT" ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch { return Response.json({ error: "Saved recipes unavailable" }, { status: 503 }); }
}
export const GET = (request: Request) => forward(request, "GET");
export const PUT = (request: Request) => forward(request, "PUT");
export const DELETE = (request: Request) => forward(request, "DELETE");
