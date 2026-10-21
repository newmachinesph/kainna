import type { z } from "zod";

export class HttpError extends Error {
  constructor(readonly status: number, readonly detail: string, readonly headers: Record<string, string> = {}) {
    super(detail);
  }
}

/** Wraps a route handler: plain return values become JSON, HttpError becomes { detail } so the client error handling stays unchanged. */
export function route<C>(fn: (request: Request, context: C) => Promise<unknown>) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      // Session cookies are SameSite=Lax, so also refuse state changes started from another site.
      if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Cross-site request refused");
      const result = await fn(request, context);
      return result instanceof Response ? result : Response.json(result);
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ detail: error.detail }, { status: error.status, headers: error.headers });
      console.error(`${request.method} ${new URL(request.url).pathname} failed`, error);
      return Response.json({ detail: "Internal Server Error" }, { status: 500 });
    }
  };
}

export function created(body: unknown): Response {
  return Response.json(body, { status: 201 });
}

export async function body<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  // A JSON content type forces a CORS preflight, so cross-site forms cannot post here.
  if (!/^application\/([\w.+-]+\+)?json\b/i.test(request.headers.get("content-type") ?? "")) throw new HttpError(415, "Request body must be JSON");
  const raw = await request.json().catch(() => { throw new HttpError(422, "Request body must be JSON"); });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(422, issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message);
  }
  return parsed.data;
}

export function searchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

export function intParam(params: URLSearchParams, name: string, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new HttpError(422, `${name} must be an integer from ${min} to ${max}`);
  return value;
}

export function boolParam(params: URLSearchParams, name: string): boolean {
  const raw = (params.get(name) ?? "").toLowerCase();
  if (["", "0", "false", "no", "off"].includes(raw)) return false;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  throw new HttpError(422, `${name} must be true or false`);
}

/** The address Hostinger's front proxy saw. Its hop is the last X-Forwarded-For entry; earlier entries come from the client and can be forged. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
