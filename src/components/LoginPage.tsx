"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "./Wordmark";

const api = "";

export function LoginPage({ register = false }: { register?: boolean }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState(params.get("invite") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = register
        ? { email, password, display_name: displayName, household_name: inviteCode ? undefined : householdName, invite_code: inviteCode || undefined }
        : { email, password };
      const response = await fetch(`${api}/v1/auth/${register ? "register" : "login"}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Please check your details and try again.");
      let transferredPlan = false;
      if (register) {
        try {
          const guest = JSON.parse(localStorage.getItem("salo-guest-v1") ?? "null") as { state?: Record<string, unknown> } | null;
          if (data.user?.role === "owner" && guest?.state?.onboarded) {
            const transfer = await fetch(`${api}/v1/household/state`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: guest.state }) });
            if (transfer.ok) { localStorage.removeItem("salo-guest-v1"); transferredPlan = true; }
          }
          const guestSaves = JSON.parse(localStorage.getItem("salosalo-guest-saved-v1") ?? "[]") as string[];
          if (Array.isArray(guestSaves) && guestSaves.length) {
            const transfers = await Promise.all(guestSaves.map(slug => fetch(`${api}/v1/me/saved`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipe_slug: slug }) })));
            if (transfers.every(item => item.ok)) localStorage.removeItem("salosalo-guest-saved-v1");
          }
        } catch { /* Guest data remains in this browser if transfer is unavailable. */ }
      }
      const next = params.get("next");
      window.location.assign(register ? (transferredPlan ? "/plan" : "/onboard") : (next?.startsWith("/") && !next.startsWith("//") ? next : "/plan"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-md pb-16 pt-10 md:pt-20">
    <Wordmark size={34} />
    <p className="eyebrow mt-10">Your place at the table</p>
    <h1 className="section-title mt-3">{register ? "Create your household" : "Welcome back"}</h1>
    <p className="mt-3 text-ink-soft">{register ? "Start as the owner, or join your family with an invitation code. Each household can have up to three accounts." : "Sign in to sync your recipes and household plan across devices."}</p>
    <form className="mt-8 space-y-4" onSubmit={submit}>
      {register && <><label className="block text-sm font-bold">Your name<input className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" required maxLength={80} autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} /></label><label className="block text-sm font-bold">Household name<input className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" required={!inviteCode} disabled={Boolean(inviteCode)} maxLength={100} value={householdName} onChange={event => setHouseholdName(event.target.value)} /></label><label className="block text-sm font-bold">Invitation code (if joining)<input className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" value={inviteCode} onChange={event => setInviteCode(event.target.value.trim())} /></label></>}
      <label className="block text-sm font-bold">Email<input className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block text-sm font-bold">Password<input className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-4 font-normal" type="password" required minLength={register ? 12 : undefined} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} /></label>
      {register && <p className="text-xs text-muted">Use at least 12 characters.</p>}
      {error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
      <button className="brand-button w-full justify-center" disabled={busy} type="submit">{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
    </form>
    <p className="mt-6 text-sm text-muted">{register ? "Already have an account?" : "New here?"} <Link className="font-bold text-accent-deep underline" href={register ? "/login" : "/signup"}>{register ? "Sign in" : "Create an account"}</Link></p>
  </div>;
}
