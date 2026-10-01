import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "./Wordmark";

const explore = [
  { href: "/recipes", label: "Explore food" },
  { href: "/merienda", label: "Merienda & sweets" },
  { href: "/saved", label: "Saved recipes" },
];

const kitchen = [
  { href: "/onboard", label: "Make a meal plan" },
  { href: "/plan", label: "My week" },
  { href: "/palengke", label: "Palengke list" },
];

export function SiteFooter() {
  return (
    <footer className="no-print bg-[#0f241b] text-paper">
      <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-14 md:px-8 md:pb-9 md:pt-16">
        <div className="grid gap-12 border-b border-paper/20 pb-12 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr] md:gap-16 md:pb-16">
          <div>
            <Link href="/" aria-label="Kain Na! home" className="inline-block"><Wordmark size={40} className="text-paper" onDark /></Link>
            <p className="mt-5 max-w-[30ch] text-[18px] leading-relaxed text-paper/75">More Filipino food on the table. Less guessing about what to cook next.</p>
            <Link href="/recipes" className="mt-7 inline-flex items-center gap-2 border-b border-[#efc448] pb-1 text-sm font-bold text-paper transition-colors hover:text-[#efc448]">Find tonight&apos;s dish <ArrowUpRight size={16} /></Link>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#efc448]">Explore</p>
            <ul className="mt-5 space-y-3">{explore.map((item) => <li key={item.href}><Link href={item.href} className="text-[15px] text-paper/75 transition-colors hover:text-paper">{item.label}</Link></li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#efc448]">Your kitchen</p>
            <ul className="mt-5 space-y-3">{kitchen.map((item) => <li key={item.href}><Link href={item.href} className="text-[15px] text-paper/75 transition-colors hover:text-paper">{item.label}</Link></li>)}</ul>
          </div>
        </div>
        <div className="pt-6 text-xs text-paper/55">
          <span>© {new Date().getFullYear()} Kain Na! Made for the Filipino table.</span>
        </div>
      </div>
    </footer>
  );
}
