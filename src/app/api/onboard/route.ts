/** Retired preview endpoint. State is stored by the planner or account API. */
export async function GET() { return Response.json({ error: "Preview endpoint retired" }, { status: 410 }); }
export async function POST() { return Response.json({ error: "Preview endpoint retired" }, { status: 410 }); }
