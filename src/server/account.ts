import { randomBytes } from "node:crypto";
import { z } from "zod";
import { hashPassword, issueSession, rateLimit, userView, verifyPassword, type User } from "./auth";
import { getRecipe } from "./catalog";
import { one, query, rows, transaction } from "./db";
import { HttpError } from "./http";
import { nowIso, parseJson, tokenDigest, withMedia } from "./util";

const MAX_ACCOUNTS = 3;
const STATE_KEYS = new Set(["locale", "onboarded", "household", "members", "plan", "history", "checkins", "swaps", "overlay", "bought", "swapTried"]);

export const RegisterRequest = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
  display_name: z.string().min(1).max(80),
  household_name: z.string().max(100).nullish(),
  invite_code: z.string().nullish(),
});
// Login only looks the address up, so it skips format checks that older accounts might not pass.
export const LoginRequest = z.object({ email: z.string().trim().min(3).max(254), password: z.string() });
export const InviteRequest = z.object({ email: z.email() });
export const SaveRecipe = z.object({ recipe_slug: z.string() });
export const HouseholdStateRequest = z.object({ state: z.record(z.string(), z.unknown()) });

const isDuplicate = (error: unknown) => (error as { code?: string }).code === "ER_DUP_ENTRY";

export async function register(payload: z.infer<typeof RegisterRequest>, ip: string) {
  await rateLimit([`register:ip:${ip}`, 10, 3600]);
  const email = payload.email.trim().toLowerCase();
  const displayName = payload.display_name.trim();
  if (!displayName) throw new HttpError(400, "Name is required");
  const now = nowIso();
  const userId = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(payload.password);
  try {
    const row = await transaction(async (db) => {
      if ((await rows(db, "SELECT 1 FROM users WHERE email = ?", [email])).length) throw new HttpError(409, "Email is already registered");
      let householdId: string, role: User["role"], isAdmin: number;
      if (payload.invite_code) {
        const [invite] = await rows(db, "SELECT * FROM invitations WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? FOR UPDATE", [tokenDigest(payload.invite_code.trim()), now]);
        if (!invite || invite.email !== email) throw new HttpError(400, "Invitation is invalid or expired");
        householdId = String(invite.household_id);
        await db.query("SELECT id FROM households WHERE id = ? FOR UPDATE", [householdId]);
        // A locking read sees members committed after this transaction's snapshot was taken.
        const [{ count }] = await rows(db, "SELECT COUNT(*) AS count FROM users WHERE household_id = ? LOCK IN SHARE MODE", [householdId]);
        if (Number(count) >= MAX_ACCOUNTS) throw new HttpError(409, "This household already has three accounts");
        [role, isAdmin] = ["member", 0];
        await db.query("UPDATE invitations SET used_at = ? WHERE code_hash = ?", [now, invite.code_hash]);
      } else {
        if (!payload.household_name?.trim()) throw new HttpError(400, "Household name is required");
        householdId = randomBytes(16).toString("hex");
        await db.query("INSERT INTO households (id, name, created_at) VALUES (?, ?, ?)", [householdId, payload.household_name.trim(), now]);
        const [{ count }] = await rows(db, "SELECT COUNT(*) AS count FROM users");
        [role, isAdmin] = ["owner", Number(Number(count) === 0)];
      }
      await db.query("INSERT INTO users (id, email, password_hash, display_name, household_id, role, is_site_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, email, passwordHash, displayName, householdId, role, isAdmin, now]);
      await issueSession(db, userId);
      return (await rows(db, "SELECT * FROM users WHERE id = ?", [userId]))[0];
    });
    return { user: userView(row), max_household_accounts: MAX_ACCOUNTS };
  } catch (error) {
    if (isDuplicate(error)) throw new HttpError(409, "Email is already registered");
    throw error;
  }
}

export async function login(payload: z.infer<typeof LoginRequest>, ip: string) {
  const email = payload.email.trim().toLowerCase();
  await rateLimit([`login:email:${email}`, 10, 900], [`login:ip:${ip}`, 50, 900]);
  const row = await one("SELECT * FROM users WHERE email = ?", [email]);
  if (!row || !(await verifyPassword(payload.password, String(row.password_hash)))) throw new HttpError(401, "Invalid email or password");
  await transaction((db) => issueSession(db, String(row.id)));
  return { user: userView(row) };
}

export async function householdMembers(user: User) {
  const [household, members, pending] = await Promise.all([
    one("SELECT name FROM households WHERE id = ?", [user.household_id]),
    query("SELECT * FROM users WHERE household_id = ? ORDER BY created_at", [user.household_id]),
    query("SELECT email, expires_at FROM invitations WHERE household_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY expires_at", [user.household_id, nowIso()]),
  ]);
  return { household_name: household?.name, members: members.map(userView), pending_invitations: pending.map(({ email, expires_at }) => ({ email, expires_at })), max_accounts: MAX_ACCOUNTS };
}

export async function createInvitation(payload: z.infer<typeof InviteRequest>, user: User) {
  await rateLimit([`invite:user:${user.id}`, 10, 3600]);
  const email = payload.email.trim().toLowerCase();
  const now = new Date();
  const code = randomBytes(24).toString("base64url");
  const expires = new Date(now.getTime() + 7 * 86400_000).toISOString();
  await transaction(async (db) => {
    await db.query("SELECT id FROM households WHERE id = ? FOR UPDATE", [user.household_id]);
    const [{ occupied }] = await rows(db, "SELECT COUNT(*) AS occupied FROM users WHERE household_id = ?", [user.household_id]);
    const [{ pending }] = await rows(db, "SELECT COUNT(*) AS pending FROM invitations WHERE household_id = ? AND used_at IS NULL AND expires_at > ?", [user.household_id, now.toISOString()]);
    if (Number(occupied) + Number(pending) >= MAX_ACCOUNTS) throw new HttpError(409, "Only two additional members are allowed");
    if ((await rows(db, "SELECT 1 FROM users WHERE email = ?", [email])).length) throw new HttpError(409, "Email is already registered");
    if ((await rows(db, "SELECT 1 FROM invitations WHERE household_id = ? AND email = ? AND used_at IS NULL AND expires_at > ?", [user.household_id, email, now.toISOString()])).length)
      throw new HttpError(409, "An invitation is already pending for this email");
    await db.query("INSERT INTO invitations (code_hash, household_id, email, created_by, expires_at) VALUES (?, ?, ?, ?, ?)", [tokenDigest(code), user.household_id, email, user.id, expires]);
  });
  return { email, invite_code: code, expires_at: expires };
}

export async function removeMember(memberId: string, user: User) {
  await transaction(async (db) => {
    await db.query("SELECT id FROM households WHERE id = ? FOR UPDATE", [user.household_id]);
    if (!(await rows(db, "SELECT id FROM users WHERE id = ? AND household_id = ? AND role = 'member'", [memberId, user.household_id])).length) throw new HttpError(404, "Member not found");
    await db.query("DELETE FROM sessions WHERE user_id = ?", [memberId]);
    await db.query("DELETE FROM saved_recipes WHERE visitor_id = ?", [memberId]);
    await db.query("DELETE FROM users WHERE id = ?", [memberId]);
  });
  return { removed: memberId };
}

export async function listSaved(user: User) {
  const saved = await query("SELECT recipes.payload FROM saved_recipes JOIN recipes ON recipes.slug = saved_recipes.recipe_slug WHERE visitor_id = ? ORDER BY saved_recipes.created_at DESC", [user.id]);
  return { items: saved.map((row) => withMedia(parseJson(row.payload))) };
}

export async function saveRecipe(payload: z.infer<typeof SaveRecipe>, user: User) {
  if (!(await getRecipe(payload.recipe_slug))) throw new HttpError(400, "Invalid recipe");
  await query("INSERT IGNORE INTO saved_recipes (visitor_id, recipe_slug) VALUES (?, ?)", [user.id, payload.recipe_slug]);
  return { saved: payload.recipe_slug };
}

export async function removeSaved(slug: string, user: User) {
  await query("DELETE FROM saved_recipes WHERE visitor_id = ? AND recipe_slug = ?", [user.id, slug]);
  return { removed: slug };
}

export async function householdState(user: User) {
  const row = await one("SELECT payload, updated_at FROM household_states WHERE household_id = ?", [user.household_id]);
  return { state: row ? parseJson(row.payload) : null, updated_at: row?.updated_at ?? null };
}

export async function saveHouseholdState(payload: z.infer<typeof HouseholdStateRequest>, user: User) {
  const encoded = JSON.stringify(Object.fromEntries(Object.entries(payload.state).filter(([key]) => STATE_KEYS.has(key))));
  if (Buffer.byteLength(encoded, "utf8") > 1_000_000) throw new HttpError(413, "Household state is too large");
  const now = nowIso();
  await query("INSERT INTO household_states (household_id, payload, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at)",
    [user.household_id, encoded, now]);
  return { updated_at: now };
}
