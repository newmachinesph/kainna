import type { ReactNode } from "react";

export function PageHeader({ title, sub, right, eyebrow }: { title: string; sub?: ReactNode; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-3 pt-6 pb-5 md:flex-row md:items-end md:justify-between md:pt-10 md:pb-7">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] leading-[1.1] md:text-[40px]">{title}</h1>
        {sub && <div className="mt-1.5 max-w-[60ch] text-[15px] text-ink-soft">{sub}</div>}
      </div>
      {right && <div className="no-scrollbar -mx-4 flex shrink-0 items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&>*]:shrink-0">{right}</div>}
    </div>
  );
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-dashed border-line-strong bg-card/60 p-8 text-center">
      <div className="display text-[20px]">{title}</div>
      {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 rounded-[12px] bg-paper-deep" />
      ))}
    </div>
  );
}