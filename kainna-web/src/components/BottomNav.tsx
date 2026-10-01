"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ShoppingBasket, CheckCircle2, UtensilsCrossed, Bookmark } from "lucide-react";
import { cn } from "@/lib/format";

const TABS = [
  { href: "/recipes", label: "Food", Icon: UtensilsCrossed },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/palengke", label: "Market", Icon: ShoppingBasket },
  { href: "/checkin", label: "Check-in", Icon: CheckCircle2 },
];

/** Mobile-only bottom tab bar. Hidden from md and up, where the header nav takes over. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden pb-safe"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors",
                  active ? "text-accent-deep" : "text-muted",
                )}
              >
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition-colors", active && "bg-accent-soft")}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
