/** Legacy demo endpoint was removed when account login became server-backed. */
export async function POST() {
  return Response.json({ error: "Use /v1/auth/login via the account form" }, { status: 410 });
}
