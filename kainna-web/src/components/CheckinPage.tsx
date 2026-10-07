"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, Check, CircleSlash, Utensils, Search } from "lucide-react";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";
import { DISHES, DISH_BY_ID, INGREDIENTS } from "@/lib/data";
import { dayName, formatDate, formatRange, isToday } from "@/lib/dates";
import { cn, roundToFive } from "@/lib/format";
import { dishName, ingredientName } from "@/lib/costing";
import type { CheckinStatus, DayKey } from "@/lib/types";
import { PageHeader, Skeleton } from "./PageHeader";
import { DishPhoto } from "./DishPhoto";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { TextInput } from "./Inputs";
import { Tag } from "./Tag";
import { PlanWeek } from "./PlanWeek";
import { SampleNotice, useSamplePlan } from "./SamplePlan";

export function CheckinPage() {
  const { t, locale } = useT();
  const hydrated = useSalo((s) => s.hydrated);
  const recipesLoaded = useSalo((s) => s.recipesLoaded);
  const pricesLoaded = useSalo((s) => s.pricesLoaded);
  const plan = useSalo((s) => s.plan);
  const household = useSalo((s) => s.household);
  const checkins = useSalo((s) => s.checkins);
  const checkin = useSalo((s) => s.checkin);
  const applyReceipt = useSalo((s) => s.applyReceipt);
  const showToast = useSalo((s) => s.showToast);

  const [otherDay, setOtherDay] = useState<DayKey | null>(null);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [ingredientId, setIngredientId] = useState(INGREDIENTS[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sample = useSamplePlan();

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DISHES.filter((d) => !s || d.name_tl.toLowerCase().includes(s) || d.name_en.toLowerCase().includes(s)).slice(0, 10);
  }, [q]);

  if (!hydrated) return <div className="pt-8"><Skeleton /></div>;
  if (!recipesLoaded || !pricesLoaded) return <p className="py-20 text-center text-muted">Recipes or prices are unavailable. Start the local API and refresh this page.</p>;
  if (!plan) {
    // No plan yet: show the sample week so the page is not empty, with check-in disabled.
    return (
      <div>
        <PageHeader eyebrow={`${sample.household.name} · ${formatRange(sample.plan.week_start, locale)}`} title={t("checkin.title")} sub={t("checkin.sub")} />
        <SampleNotice />
        <PlanWeek plan={sample.plan} household={sample.household} compact />
      </div>
    );
  }

  const done = checkins.length;
  const complete = done === 7;

  const setStatus = (day: DayKey, status: CheckinStatus, dishId?: string) => {
    checkin(day, status, dishId);
    showToast(t("toast.checkin", { day: dayName(day, locale) }));
  };

  const onFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const apply = () => {
    const numericPrice = Number(price);
    if (!ingredientId || !Number.isFinite(numericPrice) || numericPrice <= 0) return;
    applyReceipt([{ ingredient_id: ingredientId, price_php: roundToFive(numericPrice) }], []);
    showToast(t("checkin.savedPrices", { n: 1 }));
    setPrice("");
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${household.name} · ${formatRange(plan.week_start, locale)}`}
        title={t("checkin.title")}
        sub={t("checkin.sub")}
        right={<div className="tnum rounded-full border border-line bg-card px-3 py-1.5 text-[14px]">{t("checkin.progress", { done })}</div>}
      />
      {complete && <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-accent-soft px-4 py-3 text-[14px] text-accent-deep"><Check size={16} /> {t("checkin.complete")}</div>}

      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <ol className="min-w-0 divide-y divide-line rounded-[16px] border border-line bg-card md:col-span-7">
          {plan.slots.map((slot) => {
            const dish = DISH_BY_ID.get(slot.dish_id)!;
            const ck = checkins.find((c) => c.day === slot.day);
            const other = ck?.status === "other" && ck.cooked_dish_id ? DISH_BY_ID.get(ck.cooked_dish_id) : undefined;
            const today = isToday(slot.date);
            return (
              <li key={slot.id} className="p-3 md:p-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("w-12 shrink-0 md:w-16", today && "text-accent")}>
                    <div className="daymark text-[20px] md:text-[32px]">{dayName(slot.day, locale, true)}</div>
                    <div className="tnum text-[13px] text-muted">{formatDate(slot.date, locale)}</div>
                  </div>
                  <DishPhoto dish={dish} className="h-14 w-16 shrink-0 rounded-[8px] md:h-16 md:w-20" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-muted">{t("checkin.planned")}</div>
                    <div className="display truncate text-[17px] md:text-[19px]">{dishName(dish, locale)}</div>
                    {other && <div className="text-[13px] text-ink-soft">{t("checkin.other")}: {dishName(other, locale)}</div>}
                    {ck?.source === "receipt" && <Tag tone="accent" className="mt-1">{t("checkin.viaReceipt")}</Tag>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <StatusBtn active={ck?.status === "as_planned"} tone="accent" onClick={() => setStatus(slot.day, "as_planned")} icon={<Check size={15} />} label={t("checkin.asPlanned")} />
                  <StatusBtn active={ck?.status === "other"} tone="neutral" onClick={() => { setOtherDay(slot.day); setQ(""); }} icon={<Utensils size={15} />} label={t("checkin.other")} />
                  <StatusBtn active={ck?.status === "not_cooked"} tone="warn" onClick={() => setStatus(slot.day, "not_cooked")} icon={<CircleSlash size={15} />} label={t("checkin.notCooked")} />
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="min-w-0 md:col-span-5">
          <div className="rounded-[16px] border border-line bg-card p-4 md:sticky md:top-24">
            <h2 className="text-[20px]">Update a market price</h2>
            <p className="mt-1 text-[13px] text-muted">Use a receipt photo for reference, then enter the price per unit. Your shopping estimate rounds it to the nearest ₱5.</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} />
            <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) onFile(file); }} className={cn("mt-3 flex min-h-[145px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-center", dragging ? "border-accent bg-accent-wash" : "border-line-strong bg-paper")}>
              {preview ? <img src={preview} alt="Your receipt for reference" className="max-h-56 rounded-lg object-contain" /> : <><Camera className="text-muted" /><p className="text-sm text-muted">Drop a receipt photo here, if you have one.</p></>}
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><Camera size={14} /> Choose photo</Button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium">Ingredient<select value={ingredientId} onChange={(event) => setIngredientId(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-line bg-paper px-3">{INGREDIENTS.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredientName(ingredient)} ? {ingredient.unit}</option>)}</select></label>
              <label className="text-sm font-medium">Price per unit (₱)<input type="number" min="5" step="5" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} onBlur={() => { if (Number(price) > 0) setPrice(String(roundToFive(Number(price)))); }} className="mt-1 block h-11 w-full rounded-xl border border-line bg-paper px-3" /></label>
              <Button size="sm" onClick={apply} disabled={!ingredientId || Number(price) <= 0}>Save price</Button>
            </div>
          </div>
        </aside>
      </div>

      <Sheet open={otherDay !== null} onClose={() => setOtherDay(null)} title={t("checkin.whichDish")}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-muted" />
          <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="pl-9" />
        </div>
        <ul className="mt-2 max-h-[50vh] divide-y divide-line overflow-y-auto">
          {results.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => { if (otherDay) setStatus(otherDay, "other", d.id); setOtherDay(null); }} className="flex w-full items-center gap-3 py-2 text-left hover:bg-paper">
                <DishPhoto dish={d} className="h-10 w-12 rounded-[6px]" />
                <span className="flex-1 truncate">{dishName(d, locale)}</span>
                <span className="text-[13px] text-muted">{t(`protein.${d.protein_class}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

function StatusBtn({ active, tone, onClick, icon, label }: { active: boolean; tone: "accent" | "neutral" | "warn"; onClick: () => void; icon: React.ReactNode; label: string }) {
  const on = { accent: "border-accent bg-accent text-white", neutral: "border-ink bg-ink text-paper", warn: "border-warn bg-warn text-white" }[tone];
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-[13px] font-medium leading-tight transition-colors", active ? on : "border-line bg-paper text-ink hover:border-line-strong")}>
      {icon}<span>{label}</span>
    </button>
  );
}
