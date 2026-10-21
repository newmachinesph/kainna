import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { cookies } from "next/headers";
import { one, query, type Db, type Row } from "./db";
import { HttpError } from "./http";
import { nowIso, tokenDigest } from "./util";

export const SESSION_COOKIE = "salosalo_session";
const SESSION_DAYS = 14;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type User = { id: string; email: string; display_name: string; household_id: string; role: "owner" | "member"; is_site_admin: boolean };

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password.normalize("NFKC"), salt, 32, options, (error, key) => (error ? reject(error) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function userView(row: Row): User {
  return { id: String(row.id), email: String(row.email), display_name: String(row.display_name), household_id: String(row.household_id), role: row.role as User["role"], is_site_admin: Boolean(Number(row.is_site_admin)) };
}

/** Each rule is [key, max attempts, window seconds], counted in MySQL. Fails open so a database hiccup cannot lock everyone out. */
export async function rateLimit(...rules: [string, number, number][]): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, limit, window] of rules) {
    let hits: number;
    try {
      await query(`INSERT INTO rate_limits (bucket, hits, window_ends) VALUES (?, 1, ?)
        ON DUPLICATE KEY UPDATE hits = IF(window_ends <= ?, 1, hits + 1), window_ends = IF(window_ends <= ?, VALUES(window_ends), window_ends)`, [`rl:${key}`, now + window, now, now]);
      hits = Number((await one("SELECT hits FROM rate_limits WHERE bucket = ?", [`rl:${key}`]))?.hits ?? 0);
    } catch (error) {
      console.warn("Rate limit check skipped: database unavailable", error);
      return;
    }
    if (hits > limit) throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.", { "Retry-After": String(window) });
  }
}

/** The signed-in user, or null. Usable from route handlers, server components and the proxy. */
export async function currentUser(token?: string | null): Promise<User | null> {
  const session = token === undefined ? (await cookies()).get(SESSION_COOKIE)?.value : token;
  if (!session) return null;
  const row = await one("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?", [tokenDigest(session), nowIso()]);
  return row ? userView(row) : null;
}

export async function sessionUser(): Promise<User> {
  if (!(await cookies()).get(SESSION_COOKIE)?.value) throw new HttpError(401, "Sign in required");
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Session expired");
  return user;
}

export async function ownerUser(): Promise<User> {
  const user = await sessionUser();
  if (user.role !== "owner") throw new HttpError(403, "Household owner required");
  return user;
}

export async function adminUser(): Promise<User> {
  const user = await sessionUser();
  if (!user.is_site_admin) throw new HttpError(403, "Site admin required");
  return user;
}

export async function issueSession(db: Db, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [tokenDigest(token), userId, new Date(now.getTime() + SESSION_DAYS * 86400_000).toISOString(), now.toISOString()]);
  (await cookies()).set(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400, path: "/", httpOnly: true, secure: process.env.SALO_COOKIE_SECURE === "1", sameSite: "lax" });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = ?", [tokenDigest(token)]);
  jar.delete({ name: SESSION_COOKIE, path: "/" });
}
