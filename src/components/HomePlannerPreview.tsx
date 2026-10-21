"use client";

import Link from "next/link";
import { FoodImage } from "@/components/FoodImage";
import { ArrowUpRight, CalendarDays } from "lucide-react";

export type FeaturedWeek = {
  week_start: string;
  updated_at: string | null;
  days: { day: number; recipe: { slug: string; name_tl: string; name_en: string; image: string; cook_minutes: number; description_tl?: string } }[];
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HomePlannerPreview({ featured }: { featured: FeaturedWeek }) {
  return <section id="planner-preview" className="feature-split mt-20 grid scroll-mt-24 overflow-hidden md:mt-28 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]" aria-labelledby="planner-heading">
    <div className="feature-pattern flex min-w-0 flex-col justify-start p-7 md:p-10 lg:p-12">
      <div className="feature-icon"><CalendarDays size={20} /></div>
      <p className="eyebrow mt-8">This week at the table</p>
      <h2 id="planner-heading" className="section-title mt-3 max-w-[13ch]">Seven dishes, one good week.</h2>
      <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-soft">A fresh set of real recipes chosen for the week. Open any dish for ingredients and cooking steps.</p>
      <p className="mt-6 text-sm text-muted">Week of {new Date(`${featured.week_start}T12:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</p>
      <Link href="/onboard" className="brand-button mt-8 w-fit">Make your own plan <ArrowUpRight size={17} /></Link>
    </div>
    <div className="min-w-0 bg-[#ece8db] p-5 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.13em] text-accent">Featured week</p><p className="text-xs text-muted">Chosen by Kain Na!</p></div>
      <ol className="divide-y divide-line rounded-[16px] border border-line bg-card">
        {featured.days.map(({ day, recipe }) => <li key={`${day}-${recipe.slug}`} className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
          <span className="daymark w-12 shrink-0 text-[21px] md:w-16 md:text-[29px]">{weekdays[day]}</span>
          <Link href={`/recipes/${recipe.slug}`} className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-photo md:h-20 md:w-24"><FoodImage src={recipe.image} alt={recipe.name_tl} loading="lazy" className="h-full w-full object-cover" /></Link>
          <div className="min-w-0"><Link href={`/recipes/${recipe.slug}`} className="display block truncate text-[17px] hover:underline md:text-[19px]">{recipe.name_tl}</Link><p className="truncate text-[13px] text-ink-soft">{recipe.name_en}</p><p className="text-[12px] text-muted">{recipe.cook_minutes} min</p></div>
        </li>)}
      </ol>
    </div>
  </section>;
}
