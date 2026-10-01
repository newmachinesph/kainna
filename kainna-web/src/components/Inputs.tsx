"use client";
import type { ComponentProps, ReactNode } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/format";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[14px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass = "h-12 w-full rounded-[10px] border border-line bg-card px-3 text-[16px] text-ink placeholder:text-muted/70 focus:border-accent";

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function SelectInput(props: ComponentProps<"select">) {
  return <select {...props} className={cn(inputClass, "appearance-none", props.className)} />;
}

export function Chips<T extends string>({ options, value, onChange, single, size = "md" }: {
  options: { id: T; label: string; sub?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  single?: boolean;
  size?: "sm" | "md";
}) {
  const toggle = (id: T) => {
    if (single) return onChange([id]);
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border transition-colors",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]",
              on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-line-strong",
            )}
          >
            {on && <Check size={13} />}
            {o.label}
            {o.sub && <span className={cn("text-[13px]", on ? "text-paper/70" : "text-muted")}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, min = 1, max = 12, onChange, label }: { value: number; min?: number; max?: number; onChange: (n: number) => void; label?: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-line bg-card p-1" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper-deep" aria-label="minus" disabled={value <= min}>
        <Minus size={16} />
      </button>
      <span className="display w-10 text-center text-[26px]" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper-deep" aria-label="plus" disabled={value >= max}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-line bg-card px-4 py-3 text-left hover:border-line-strong">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function OptionCard({ selected, onClick, title, sub, meta }: { selected: boolean; onClick: () => void; title: string; sub?: string; meta?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-[14px] border p-4 text-left transition-colors",
        selected ? "border-accent bg-accent-wash" : "border-line bg-card hover:border-line-strong",
      )}
    >
      <span>
        <span className="display block text-[18px]">{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] text-muted">{sub}</span>}
      </span>
      {meta && <span className="peso shrink-0 text-[18px]">{meta}</span>}
    </button>
  );
}