"use client";
import Link from "next/link";
import { useState } from "react";
import { RefreshCw, Save, RotateCcw } from "lucide-react";
import type { DayKey, Household, Member, Region } from "@/lib/types";
import { TIERS, REGIONS } from "@/lib/config";
import { DAY_KEYS, dayName } from "@/lib/dates";
import { peso } from "@/lib/format";
import { LOCALES } from "@/lib/i18n";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { PageHeader, Skeleton } from "./PageHeader";
import { Button } from "./Button";
import { Chips, Field, OptionCard, SelectInput, Stepper, TextInput } from "./Inputs";
import { MemberEditor } from "./MemberEditor";
import { AccountHousehold } from "./AccountHousehold";

export function SettingsPage() {
  const hydrated = useSalo((s) => s.hydrated);
  const household = useSalo((s) => s.household);
  const members = useSalo((s) => s.members);
  const onboarded = useSalo((s) => s.onboarded);
  if (!hydrated) return <div className="pt-8"><Skeleton rows={4} /></div>;
  if (!onboarded) return <div className="pt-10"><AccountHousehold /><section className="rounded-2xl border border-line bg-card p-8"><h1 className="section-title">Set up your table</h1><p className="mt-3 text-muted">Create a meal plan to set your household size, budget, food preferences, and shopping list.</p><Link href="/onboard" className="brand-button mt-6">Start planning</Link></section></div>;
  return <SettingsForm key={household.id} initial={household} initialMembers={members} />;
}

function SettingsForm({ initial, initialMembers }: { initial: Household; initialMembers: Member[] }) {
  const { t, locale } = useT();
  const household = useSalo((s) => s.household);
  const members = useSalo((s) => s.members);
  const flags = useSalo((s) => s.flags);
  const setLocale = useSalo((s) => s.setLocale);
  const save = useSalo((s) => s.saveHousehold);
  const regenerate = useSalo((s) => s.regenerate);
  const resetDemo = useSalo((s) => s.resetDemo);
  const [h, setH] = useState<Household>(initial);
  const [m, setM] = useState<Member[]>(initialMembers);
  const dirty = JSON.stringify(h) !== JSON.stringify(household) || JSON.stringify(m) !== JSON.stringify(members);

  return (
    <div>
      <AccountHousehold />
      <PageHeader title={t("settings.title")} sub={t("settings.sub")} right={
        <>
          <Button variant="secondary" size="sm" onClick={() => { save(h, m); regenerate(); }}><RefreshCw size={15} /> {t("settings.regenNote")}</Button>
          <Button size="sm" onClick={() => save(h, m)} disabled={!dirty}><Save size={15} /> {t("common.save")}</Button>
        </>
      } />
      <div className="grid gap-8 md:grid-cols-12">
        <div className="space-y-8 md:col-span-7">
          <section className="space-y-4">
            <h2 className="text-[22px]">{t("settings.household")}</h2>
            <Field label={t("onboard.householdName")}><TextInput value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} /></Field>
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-medium">{t("onboard.step1")}</span>
              <Stepper value={h.size} min={1} max={12} onChange={(n) => setH({ ...h, size: n })} />
            </div>
            <div className="space-y-2">
              <div className="text-[14px] font-medium">{t("onboard.step2")}</div>
              {TIERS.map((tr) => <OptionCard key={tr.id} selected={h.budget_tier === tr.id} onClick={() => setH({ ...h, budget_tier: tr.id })} title={t(`tier.${tr.id}`)} sub={t(`tier.${tr.id}.d`)} meta={peso(tr.daily_php)} />)}
            </div>
            <Field label={t("onboard.step3")}>
              <SelectInput value={h.region} onChange={(e) => setH({ ...h, region: e.target.value as Region })}>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}</SelectInput>
            </Field>
            <div>
              <div className="mb-1.5 text-[14px] font-medium">{t("onboard.step4")}</div>
              <Chips size="sm" options={DAY_KEYS.map((d) => ({ id: d, label: dayName(d, locale, true) }))} value={h.rushed_days} onChange={(v) => setH({ ...h, rushed_days: v as DayKey[] })} />
            </div>
            <div>
              <div className="mb-1.5 text-[14px] font-medium">{t("onboard.payCycle")}</div>
              <Chips size="sm" single options={[{ id: "15,30", label: t("onboard.pay.15-30") }, { id: "30", label: t("onboard.pay.30") }, { id: "7,14,21,28", label: t("onboard.pay.weekly") }]} value={[h.pay_cycle_dates.join(",")]} onChange={(v) => setH({ ...h, pay_cycle_dates: v[0].split(",").map(Number) })} />
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-[22px]">{t("settings.members")}</h2>
            <p className="text-sm text-muted">Meal preference profiles for people at your table. Account access is managed above.</p>
            <MemberEditor members={m} onChange={setM} />
          </section>
        </div>
        <div className="space-y-8 md:col-span-5">
          <section className="space-y-3">
            <h2 className="text-[22px]">{t("settings.locale")}</h2>
            <Chips single options={LOCALES.filter((l) => l.id !== "ceb" || flags.ceb_enabled).map((l) => ({ id: l.id, label: l.label }))} value={[locale]} onChange={(v) => setLocale(v[0] as typeof locale)} />
          </section>
          <section className="rounded-[14px] border border-warn/30 bg-warn-soft/40 p-4">
            <div className="font-medium">Clear meal-plan data</div>
            <p className="mt-1 text-[13px] text-muted">Remove your plan, check-ins, shopping progress, and preferences from this workspace.</p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => { if (window.confirm("Clear this workspace's meal-plan data?")) resetDemo(); }}><RotateCcw size={14} /> Clear plan data</Button>
          </section>
        </div>
      </div>
    </div>
  );
}
