"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Member = { id: string; email: string; display_name: string; role: "owner" | "member"; is_site_admin: boolean };
type Account = { user: Member };
type Household = { household_name: string; members: Member[]; pending_invitations: { email: string; expires_at: string }[]; max_accounts: number };
const api = "";

export function AccountHousehold() {
  const [account, setAccount] = useState<Account | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [guest, setGuest] = useState(false);
  async function refresh() {
    const [me, family] = await Promise.all([fetch(`${api}/v1/auth/me`, { credentials: "include" }), fetch(`${api}/v1/household/members`, { credentials: "include" })]);
    if (me.ok && family.ok) { setAccount(await me.json()); setHousehold(await family.json()); }
    else if (me.status === 401) setGuest(true);
  }
  useEffect(() => { const task = Promise.resolve().then(() => refresh()); task.catch(() => setMessage("Could not load household accounts.")); }, []);
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`${api}/v1/household/invitations`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.detail ?? "Could not create invitation."); return; }
    setCode(data.invite_code); setEmail(""); await refresh();
  }
  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.display_name} from your household?`)) return;
    const response = await fetch(`${api}/v1/household/members/${member.id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { setMessage("Could not remove member."); return; }
    await refresh();
  }
  async function logout() { await fetch(`${api}/v1/auth/logout`, { method: "POST", credentials: "include" }); window.location.assign(new URL("/login", window.location.origin).href); }
  if (guest) return <section className="mb-8 rounded-2xl border border-line bg-card p-5 md:p-7"><p className="eyebrow">Guest workspace</p><h2 className="mt-2 text-2xl font-bold">Plan without an account</h2><p className="mt-2 max-w-xl text-sm text-muted">Your plan, check-ins, and shopping list stay in this browser. Create an account to save them in your household database and invite up to two people.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/signup" className="brand-button">Create account</Link><Link href="/login" className="brand-button-outline">Sign in</Link></div></section>;
  return <section className="mb-8 rounded-2xl border border-line bg-card p-5 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Account access</p><h2 className="mt-2 text-2xl font-bold">{household?.household_name ?? "Your household"}</h2><p className="text-sm text-muted">{household ? `${household.members.length} of 3 accounts in use` : "Loading accounts…"}</p></div><div className="flex gap-2">{account?.user.is_site_admin && <Link href="/admin" className="brand-button-outline">Manage content</Link>}<button className="brand-button-outline" onClick={logout}>Sign out</button></div></div>
    {household && <div className="mt-5 space-y-2">{household.members.map(member => <div key={member.id} className="flex items-center justify-between gap-2 rounded-xl bg-paper p-3"><div><strong>{member.display_name}</strong> <span className="text-xs text-muted">· {member.role}</span><p className="text-sm text-muted">{member.email}</p></div>{account?.user.role === "owner" && member.role === "member" && <button onClick={() => remove(member)} className="text-sm font-bold text-warn">Remove</button>}</div>)}</div>}
    {household?.pending_invitations.map(item => <p key={item.email} className="mt-2 text-sm text-muted">Invitation pending: {item.email}</p>)}
    {account?.user.role === "owner" && household && household.members.length + household.pending_invitations.length < 3 && <form onSubmit={invite} className="mt-6 flex flex-wrap gap-2"><input type="email" required placeholder="Member email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 min-w-48 flex-1 rounded-xl border border-line bg-paper px-3" /><button className="brand-button" type="submit">Create invitation</button></form>}
    {code && <div className="mt-3 rounded-xl bg-accent-soft p-3 text-sm"><p>Share this code privately with the invited person. It expires in 7 days.</p><code className="mt-2 block break-all font-bold">{code}</code><p className="mt-2">They can enter it on the Create account page.</p></div>}
    {message && <p role="status" className="mt-3 text-sm text-warn">{message}</p>}
  </section>;
}
