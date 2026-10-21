"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { DayKey, Household, Member, Region } from "@/lib/types";
import { TIERS, REGIONS, HOUSEHOLD_SIZES } from "@/lib/config";
import { DAY_KEYS, dayName } from "@/lib/dates";
import { peso, uid, cn } from "@/lib/format";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { Button } from "./Button";
import { Chips, Field, OptionCard, SelectInput, Stepper, TextInput } from "./Inputs";
import { MemberEditor } from "./MemberEditor";
import { PlanWeek } from "./PlanWeek";
import { BudgetBar } from "./BudgetBar";
import { planTotal } from "@/lib/engine";

const TOTAL = 5;

export function OnboardWizard() {
  const { t, locale } = useT();
  const router = useRouter();
  const complete = useSalo((s) => s.completeOnboarding);
  const plan = useSalo((s) => s.plan);
  const hydrated = useSalo((s) => s.hydrated);
  const recipesLoaded = useSalo((s) => s.recipesLoaded);
  const pricesLoaded = useSalo((s) => s.pricesLoaded);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [size, setSize] = useState(4);
  const [tier, setTier] = useState<Household["budget_tier"]>("sapat");
  const [region, setRegion] = useState<Region>("NCR");
  const [pay, setPay] = useState<"15-30" | "30" | "weekly">("15-30");
  const [rushed, setRushed] = useState<DayKey[]>(["tue", "thu"]);
  const [members, setMembers] = useState<Member[]>([
    { id: uid("m"), label: "", dietary_flags: [], ayaw_dish_ids: [] },
    { id: uid("m"), label: "", dietary_flags: [], ayaw_dish_ids: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const finish = async () => {
    setSubmitting(true);
    const household: Household = {
      id: uid("hh"), name: name.trim() || t("onboard.householdNamePh"), size, budget_tier: tier, region,
      pay_cycle_dates: pay === "15-30" ? [15, 30] : pay === "30" ? [30] : [7, 14, 21, 28],
      rushed_days: rushed, locale, email: "", viber_opt_in: false, created_at: new Date().toISOString(),
    };
    const cleanMembers = members.filter((m) => m.label.trim() || m.dietary_flags.length || m.ayaw_dish_ids.length).map((m, i) => ({ ...m, label: m.label.trim() || `Kasama ${i + 1}` }));
    complete(household, cleanMembers.length ? cleanMembers : [{ id: uid("m"), label: "Pamilya", dietary_flags: [], ayaw_dish_ids: [] }]);
    setSubmitting(false);
    setDone(true);
    window.scrollTo({ top: 0 });
  };

  if (!hydrated) return <p className="py-20 text-center text-muted">Loading recipes and prices…</p>;
  if (!recipesLoaded || !pricesLoaded) return <p className="py-20 text-center text-muted">Recipes or prices are unavailable. Start the local API and refresh this page.</p>;

  if (done && plan) {
    const household = useSalo.getState().household;
    return (
      <div className="mx-auto max-w-3xl pt-8 md:pt-14">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white"><Check size={20} /></span>
          <h1 className="text-[30px] md:text-[40px]">{t("onboard.done.t")}</h1>
        </div>
        <p className="mt-2 text-[15px] text-ink-soft">Your plan is ready. You can adjust dishes, track meals, and update your shopping list.</p>
        <div className="mt-6 space-y-4">
          <BudgetBar spent={planTotal(plan)} ceiling={plan.ceiling} />
          <PlanWeek plan={plan} household={household} compact />
        </div>
        <div className="mt-6 flex gap-2">
          <Button size="lg" onClick={() => router.push("/plan")}>{t("onboard.viewPlan")} <ArrowRight size={18} /></Button>
        </div>
      </div>
    );
  }

  const titles = ["onboard.step1", "onboard.step2", "onboard.step3", "onboard.step4", "onboard.step5", "onboard.step6"];

  return (
    <div className="mx-auto max-w-2xl pt-6 md:pt-12">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{t("onboard.title")}</span>
        <span className="tnum">{t("onboard.progress", { step, total: TOTAL })}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: TOTAL }).map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < step ? "bg-accent" : "bg-paper-deep")} />)}
      </div>
      <h1 className="mt-6 text-[30px] md:text-[40px]">{t(titles[step - 1])}</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">{t(`${titles[step - 1]}.sub`)}</p>

      <div key={step} className="rise mt-6 space-y-5">
        {step === 1 && (
          <>
            <Field label={t("onboard.householdName")}><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t("onboard.householdNamePh")} /></Field>
            <div className="flex flex-wrap items-center gap-4">
              <Stepper value={size} min={1} max={12} onChange={setSize} label={t("onboard.step1")} />
              <Chips size="sm" single options={HOUSEHOLD_SIZES.map((n) => ({ id: String(n), label: String(n) }))} value={[String(size)]} onChange={(v) => setSize(Number(v[0]))} />
            </div>
          </>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {TIERS.map((tr) => (
              <OptionCard key={tr.id} selected={tier === tr.id} onClick={() => setTier(tr.id)} title={t(`tier.${tr.id}`)} sub={`${t("budget.tierRange", { lo: peso(tr.range_php[0]), hi: peso(tr.range_php[1]) })}. ${t(`tier.${tr.id}.d`)}`} meta={`${peso(tr.daily_php)}/${t("common.perDay").split(" ")[1] ?? "araw"}`} />
            ))}
          </div>
        )}
        {step === 3 && (
          <>
            <Field label={t("onboard.step3")}>
              <SelectInput value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </SelectInput>
            </Field>
            <div>
              <div className="mb-1 text-[14px] font-medium">{t("onboard.payCycle")}</div>
              <div className="mb-2 text-[13px] text-muted">{t("onboard.payCycle.sub")}</div>
              <Chips single options={[{ id: "15-30", label: t("onboard.pay.15-30") }, { id: "30", label: t("onboard.pay.30") }, { id: "weekly", label: t("onboard.pay.weekly") }]} value={[pay]} onChange={(v) => setPay(v[0] as typeof pay)} />
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <Chips options={DAY_KEYS.map((d) => ({ id: d, label: dayName(d, locale) }))} value={rushed} onChange={setRushed} />
            <button type="button" onClick={() => setRushed([])} className={cn("text-[14px] underline underline-offset-4", rushed.length === 0 ? "text-ink" : "text-muted")}>{t("onboard.rushedNone")}</button>
          </>
        )}
        {step === 5 && (
          <>
            <p className="text-[13px] text-muted">{t("onboard.memberHint")}</p>
            <MemberEditor members={members} onChange={setMembers} />
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft size={16} /> {t("common.back")}</Button>
        {step < TOTAL ? (
          <Button size="lg" onClick={() => setStep(step + 1)}>{t("common.next")} <ArrowRight size={18} /></Button>
        ) : (
          <Button size="lg" onClick={finish} disabled={submitting}>{t("onboard.finish")} <ArrowRight size={18} /></Button>
        )}
      </div>
    </div>
  );
}
