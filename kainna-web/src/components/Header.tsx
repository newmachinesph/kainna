"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Settings2 } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/recipes", label: "Food & recipes" },
  { href: "/merienda", label: "Merienda" },
  { href: "/plan", label: "Meal plan" },
  { href: "/palengke", label: "Palengke list" },
  { href: "/checkin", label: "Check-in" },
  { href: "/saved", label: "Saved" },
];

export function Header() {
  const pathname = usePathname();
  const { t } = useT();
  const household = useSalo((s) => s.household);
  const hydrated = useSalo((s) => s.hydrated);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-paper/20 bg-[#0f241b]/95 text-paper backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-4 md:h-20 md:px-8">
        <Link href="/" className="flex items-center" aria-label="Kain Na! home">
          <Wordmark size={26} className="text-paper" onDark />
        </Link>
        <nav className="hidden items-center gap-0 lg:flex" aria-label="Primary">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[14px] font-semibold transition-colors",
                  active ? "bg-[#efc448] text-[#0f241b]" : "text-paper/80 hover:bg-white/10 hover:text-paper",
                )}
                aria-current={active ? "page" : undefined}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/onboard" className="hidden items-center gap-1.5 rounded-full bg-[#efc448] px-4 py-2 text-[13px] font-bold text-[#0f241b] transition-transform hover:scale-[1.02] md:inline-flex">Start planning <ArrowUpRight size={15} /></Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full border border-paper/30 bg-white/5 px-3 py-2 text-sm text-paper/85 hover:border-paper/60 hover:text-paper"
          >
            <Settings2 size={15} />
            <span className="hidden max-w-[140px] truncate sm:inline">{hydrated ? household.name : t("common.household")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
