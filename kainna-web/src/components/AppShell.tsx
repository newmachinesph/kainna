"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { SiteFooter } from "./SiteFooter";
import { Toast } from "./Toast";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";
import { Button } from "./Button";
import { replaceDishes } from "@/lib/data";
import type { Dish } from "@/lib/types";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function StoreHydrator() {
  const setHydrated = useSalo((s) => s.setHydrated);
  const rollover = useSalo((s) => s.rolloverIfNeeded);
  const log = useSalo((s) => s.log);
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const me = await fetch("/v1/auth/me", { credentials: "include", cache: "no-store" });
        if (me.ok) {
          const identity = await me.json() as { user: { household_id: string } };
          useSalo.persist.setOptions({ name: `salo-household-${identity.user.household_id}` });
          await useSalo.persist.rehydrate();
          const response = await fetch("/v1/household/state", { credentials: "include", cache: "no-store" });
          if (response.ok) {
            const data = await response.json() as { state: Record<string, unknown> | null };
            if (data.state) useSalo.setState(data.state);
          }
          if (cancelled) return;
          let last = "";
          const sync = () => {
            const state = useSalo.getState();
            const snapshot = { locale: state.locale, onboarded: state.onboarded, household: state.household,
              members: state.members, plan: state.plan, history: state.history, checkins: state.checkins,
              swaps: state.swaps, overlay: state.overlay, bought: state.bought, swapTried: state.swapTried };
            const encoded = JSON.stringify(snapshot);
            if (encoded === last) return;
            last = encoded;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fetch("/v1/household/state", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: snapshot }) }).catch(() => undefined), 500);
          };
          unsubscribe = useSalo.subscribe(sync);
          sync();
        } else {
          useSalo.persist.setOptions({ name: "salo-guest-v1" });
          await useSalo.persist.rehydrate();
        }
        const pricesResponse = await fetch("/v1/ingredients", { cache: "no-store" });
        if (pricesResponse.ok) {
          const data = await pricesResponse.json() as { items: { id: string; price_php: number; price_updated_at: string }[] };
          useSalo.getState().setMarketPrices(data.items.map(item => ({ ingredient_id: item.id, price_php: item.price_php,
            observed_at: item.price_updated_at, source: "market" as const })));
        }
        const recipesResponse = await fetch("/v1/recipes", { cache: "no-store" });
        if (recipesResponse.ok) {
          const data = await recipesResponse.json() as { items: Dish[] };
          if (data.items.length) {
            replaceDishes(data.items);
            useSalo.getState().refreshPlanCosts();
            useSalo.getState().setRecipesLoaded();
          }
        }
      } catch {
        if (useSalo.persist.getOptions().name === "salo-guest-v1") await useSalo.persist.rehydrate();
      }
      if (cancelled) return;
      rollover();
      setHydrated();
    })();
    // Keep several open tabs in step: when another tab writes the store, re-read it here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === useSalo.persist.getOptions().name) useSalo.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => { cancelled = true; unsubscribe?.(); if (timer) clearTimeout(timer); window.removeEventListener("storage", onStorage); };
  }, [setHydrated, rollover]);
  useEffect(() => {
    if (useSalo.getState().hydrated) log("page_visit", { path: pathname });
  }, [pathname, log]);
  return null;
}

function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

function InstallPrompt() {
  const { t } = useT();
  const pathname = usePathname();
  const dismissed = useSalo((s) => s.installDismissed);
  const dismiss = useSalo((s) => s.dismissInstall);
  const hydrated = useSalo((s) => s.hydrated);
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!hydrated || dismissed || !evt || (pathname !== "/settings" && pathname !== "/plan")) return null;
  return (
    <div className="no-print fixed inset-x-3 bottom-[76px] z-50 rounded-[14px] border border-line bg-card p-3 shadow-lift md:inset-x-auto md:bottom-6 md:right-6 md:w-80">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white"><Download size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Install Kain Na!</div>
          <div className="text-sm text-muted">{t("install.sub")}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={async () => { await evt.prompt(); dismiss(); }}>{t("install.btn")}</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>{t("install.later")}</Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-muted" aria-label="Close"><X size={16} /></button>
      </div>
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
}

function OfflineBanner() {
  const { t } = useT();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (online) return null;
  return <div className="bg-ink px-4 py-1.5 text-center text-xs text-paper">{t("toast.offline")}</div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <StoreHydrator />
      <ServiceWorker />
      <OfflineBanner />
      <Header />
      <main className={`mx-auto w-full max-w-[1400px] flex-1 px-4 md:px-8 ${pathname === "/" ? "pb-0" : "pb-14 md:pb-12"}`}>{children}</main>
      <SiteFooter />
      <BottomNav />
      <Toast />
      <InstallPrompt />
    </>
  );
}
