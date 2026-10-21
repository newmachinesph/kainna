"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Check } from "lucide-react";
import type { DietaryFlag, Member } from "@/lib/types";
import { DIETARY_FLAGS } from "@/lib/config";
import { DISHES, DISH_BY_ID } from "@/lib/data";
import { dishName } from "@/lib/costing";
import { uid, cn } from "@/lib/format";
import { useT } from "@/lib/useT";
import { Chips, TextInput } from "./Inputs";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { DishPhoto } from "./DishPhoto";

export function MemberEditor({ members, onChange }: { members: Member[]; onChange: (m: Member[]) => void }) {
  const { t, locale } = useT();
  const [ayawFor, setAyawFor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const update = (id: string, patch: Partial<Member>) => onChange(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const remove = (id: string) => onChange(members.filter((m) => m.id !== id));
  const add = () => onChange([...members, { id: uid("m"), label: "", dietary_flags: [], ayaw_dish_ids: [] }]);
  const target = members.find((m) => m.id === ayawFor);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DISHES.filter((d) => !s || d.name_tl.toLowerCase().includes(s) || d.name_en.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="space-y-3">
      {members.map((m, i) => (
        <div key={m.id} className="rounded-[14px] border border-line bg-card p-3 md:p-4">
          <div className="flex items-center gap-2">
            <TextInput value={m.label} onChange={(e) => update(m.id, { label: e.target.value })} placeholder={i === 0 ? "Tatay" : i === 1 ? "Nanay" : t("onboard.memberLabel")} aria-label={t("onboard.memberLabel")} />
            {members.length > 1 && (
              <button type="button" onClick={() => remove(m.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-warn-soft hover:text-warn" aria-label={t("common.remove")}><Trash2 size={16} /></button>
            )}
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-[13px] text-muted">{t("onboard.dietary")}</div>
            <Chips size="sm" options={DIETARY_FLAGS.map((f) => ({ id: f, label: t(`flag.${f}`) }))} value={m.dietary_flags} onChange={(v) => update(m.id, { dietary_flags: v as DietaryFlag[] })} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">{t("onboard.ayaw")}:</span>
            {m.ayaw_dish_ids.length === 0 && <span className="text-[13px] text-muted">{t("onboard.ayawNone")}</span>}
            {m.ayaw_dish_ids.map((id) => {
              const d = DISH_BY_ID.get(id);
              return d ? (
                <button key={id} type="button" onClick={() => update(m.id, { ayaw_dish_ids: m.ayaw_dish_ids.filter((x) => x !== id) })} className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[13px] text-warn hover:line-through">{dishName(d, locale)}</button>
              ) : null;
            })}
            <button type="button" onClick={() => { setAyawFor(m.id); setQ(""); }} className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-paper px-3 text-[13px] hover:border-line-strong"><Plus size={13} /> {t("onboard.ayawPick")}</button>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={add}><Plus size={16} /> {t("onboard.addMember")}</Button>

      <Sheet open={Boolean(target)} onClose={() => setAyawFor(null)} title={target ? `${t("onboard.ayaw")}: ${target.label || t("onboard.memberLabel")}` : ""}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-muted" />
          <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="pl-9" />
        </div>
        <ul className="mt-2 max-h-[50vh] divide-y divide-line overflow-y-auto">
          {results.map((d) => {
            const on = target?.ayaw_dish_ids.includes(d.id) ?? false;
            return (
              <li key={d.id}>
                <button type="button" aria-pressed={on} onClick={() => target && update(target.id, { ayaw_dish_ids: on ? target.ayaw_dish_ids.filter((x) => x !== d.id) : [...target.ayaw_dish_ids, d.id] })} className={cn("flex w-full items-center gap-3 py-2 text-left hover:bg-paper", on && "text-warn")}>
                  <DishPhoto dish={d} className="h-10 w-12 rounded-[6px]" />
                  <span className="flex-1 truncate">{dishName(d, locale)}</span>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border", on ? "border-warn bg-warn text-white" : "border-line-strong")}>{on && <Check size={13} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={() => setAyawFor(null)}>{t("common.done")}</Button></div>
      </Sheet>
    </div>
  );
}