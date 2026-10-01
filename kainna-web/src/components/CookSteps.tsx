"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function CookSteps({ steps, title = "How to make it" }: { steps: string[]; title?: string }) {
  const [done, setDone] = useState<number[]>([]);
  return <><div className="flex items-baseline justify-between gap-3"><h2 className="text-2xl">{title}</h2><span className="text-sm text-muted" aria-live="polite">{done.length}/{steps.length} done</span></div><ol className="mt-4 space-y-3">{steps.map((step, index) => <li key={index}><button type="button" aria-pressed={done.includes(index)} onClick={() => setDone((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} className="flex w-full gap-3 rounded-xl border border-line bg-card p-4 text-left text-[15px] leading-relaxed hover:border-line-strong"><span className={`display flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${done.includes(index) ? "bg-accent text-white" : "bg-paper-deep"}`}>{done.includes(index) ? <Check size={15} /> : index + 1}</span><span className={done.includes(index) ? "text-muted line-through" : ""}>{step}</span></button></li>)}</ol></>;
}
