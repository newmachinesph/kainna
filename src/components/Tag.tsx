import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type Tone = "neutral" | "accent" | "warn" | "ink" | "sponsor";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-deep text-ink-soft",
  accent: "bg-accent-soft text-accent-deep",
  warn: "bg-warn-soft text-warn",
  ink: "bg-ink text-paper",
  sponsor: "bg-[#fbefd2] text-[#7a5a12]",
};

export function Tag({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium leading-5 whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}