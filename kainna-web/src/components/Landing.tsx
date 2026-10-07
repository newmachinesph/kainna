"use client";

import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, CalendarDays, ChefHat, ShoppingBasket, Clock3, Users } from "lucide-react";
import { HomePlannerPreview, type FeaturedWeek } from "./HomePlannerPreview";
import { HomeFAQ } from "./HomeFAQ";
import { SaveRecipeButton } from "./SaveRecipeButton";
import { FoodImage } from "./FoodImage";
import { categoryHref, foodHref } from "@/lib/catalog-urls";

export type HomePick = { id: string; title: string; image: string; category: string; recipe_slug: string | null; merienda_slug: string | null };
export type HomeCategory = { name: string; caption: string; count: number; image: string };
export type HomeSpotlight = { slug: string; name_tl: string; name_en: string; description_tl: string; image: string; cook_minutes: number; servings: number; steps_short: string[] };

export function Landing({ featured, picks, categories, spotlight, catalogCount, recipeCount }: { featured: FeaturedWeek; picks: HomePick[]; categories: HomeCategory[]; spotlight: HomeSpotlight; catalogCount: number; recipeCount: number }) {
  const hero = picks[0];

  return (
    <MotionConfig reducedMotion="user">
      <div>
        <section className="hero-grid relative grid gap-8 py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] md:items-center md:gap-10 md:py-12">
          <div className="relative z-10 pt-4 md:pt-0">
            <p className="eyebrow"><span className="eyebrow-line" /> Lutong bahay, made easier</p>
            <h1 className="hero-title mt-7">A seat at the table for <em>every</em> ulam.</h1>
            <p className="mt-6 max-w-[51ch] text-[17px] leading-[1.65] text-ink-soft md:text-[19px]">Discover Filipino dishes, save the ones you love, and plan a week of meals that fits your family and budget.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/recipes" className="brand-button">Explore the food <ArrowRight size={18} /></Link>
              <Link href="/onboard" className="brand-button-outline">Make a meal plan <ArrowUpRight size={18} /></Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-5 text-[14px] text-muted">
              <span><strong className="text-ink">{catalogCount.toLocaleString()}</strong> food images</span>
              <span><strong className="text-ink">{recipeCount.toLocaleString()}</strong> recipes with steps</span>
              <span><strong className="text-ink">7 days</strong> planned in minutes</span>
            </div>
          </div>
          <div className="hero-visual relative">
            <div className="hero-image-frame"><FoodImage src={hero.image} alt={hero.title} variant="full" fetchPriority="high" /></div>
            <div className="hero-sticker" aria-hidden="true"><span>Sarap</span><span>starts here</span></div>
            <div className="hero-caption"><span className="caption-dot" /> Tonight&apos;s idea <strong>{hero.title}</strong></div>
          </div>
        </section>

        <section className="mt-12 border-y border-line py-5 md:mt-16" aria-label="What you can do">
          <div className="grid gap-5 md:grid-cols-3 md:gap-8">
            <div className="flex items-start gap-3"><ChefHat className="mt-1 shrink-0 text-accent" size={21} /><p className="text-[15px]"><strong className="block text-ink">Find your next favorite</strong><span className="text-muted">From adobo to dishes you haven&apos;t met yet.</span></p></div>
            <div className="flex items-start gap-3"><CalendarDays className="mt-1 shrink-0 text-accent" size={21} /><p className="text-[15px]"><strong className="block text-ink">Plan around real life</strong><span className="text-muted">Budget, busy nights, and everyone&apos;s tastes.</span></p></div>
            <div className="flex items-start gap-3"><ShoppingBasket className="mt-1 shrink-0 text-accent" size={21} /><p className="text-[15px]"><strong className="block text-ink">Shop with one list</strong><span className="text-muted">Ingredients grouped for palengke day.</span></p></div>
          </div>
        </section>

        <section className="mt-20 md:mt-28" aria-labelledby="featured-heading">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Start with something good</p><h2 id="featured-heading" className="section-title mt-3">What sounds good today?</h2></div>
            <Link href="/recipes" className="text-link">See the full collection <ArrowUpRight size={17} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {picks.map((dish) => <Link key={dish.id} href={foodHref(dish)} className="food-card group">
              <div className="aspect-[4/3] overflow-hidden bg-photo"><FoodImage src={dish.image} alt={dish.title} loading="lazy" /></div>
              <div className="px-1 pb-2 pt-4"><p className="text-[12px] font-semibold uppercase tracking-[.13em] text-accent">{dish.category}</p><h3 className="mt-1 text-[17px] font-bold leading-tight md:text-[20px]">{dish.title}</h3></div>
            </Link>)}
          </div>
        </section>

        <section id="categories" className="mt-20 scroll-mt-24 md:mt-28" aria-labelledby="category-heading">
          <div className="mb-7 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)] md:items-end">
            <div><p className="eyebrow">Follow your appetite</p><h2 id="category-heading" className="section-title mt-3 max-w-[13ch]">Find a dish for the mood you&apos;re in.</h2></div>
            <p className="max-w-[42ch] text-[16px] leading-relaxed text-ink-soft md:justify-self-end">Browse by what you&apos;re craving, then use the recipe filter when you&apos;re ready to cook.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-4">
            {categories.map((tile, index) => <Link key={tile.name} href={categoryHref(tile.name)} className={`group min-w-0 ${index === 0 ? "md:col-span-5" : index === 1 ? "md:col-span-3" : "md:col-span-4"}`}>
              <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.22 }} className="relative h-48 overflow-hidden rounded-[18px] bg-photo md:h-72">
                <FoodImage src={tile.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-transparent" />
                <span className="absolute right-4 top-4 rounded-full border border-white/50 bg-ink/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">{tile.count.toLocaleString()} dishes</span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/75">{tile.caption}</p><h3 className="mt-1 text-[22px] leading-tight md:text-[28px]">{tile.name}</h3></div>
              </motion.div>
            </Link>)}
          </div>
        </section>

        <HomePlannerPreview featured={featured} />

        <section id="recipe-spotlight" className="mt-20 grid scroll-mt-28 gap-8 md:mt-28 md:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)] md:items-center md:gap-14" aria-labelledby="recipe-heading">
          <div className="relative overflow-hidden rounded-[22px] bg-photo"><FoodImage src={spotlight.image} alt={spotlight.name_en} variant="full" loading="lazy" className="aspect-[4/4.2] h-full w-full object-cover md:aspect-[4/4.5]" /><span className="absolute bottom-5 left-5 rounded-full bg-card px-4 py-2 text-xs font-bold text-ink shadow-lift">A recipe for tonight</span></div>
          <div>
            <p className="eyebrow">Cook with confidence</p>
            <h2 id="recipe-heading" className="section-title mt-3 max-w-[13ch]">{spotlight.name_tl}</h2>
            <p className="mt-2 text-lg text-muted">{spotlight.name_en}</p>
            <p className="mt-5 max-w-[45ch] leading-relaxed text-ink-soft">{spotlight.description_tl}</p>
            <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold"><span className="flex items-center gap-2"><Clock3 size={16} className="text-accent" /> {spotlight.cook_minutes} min</span><span className="flex items-center gap-2"><Users size={16} className="text-accent" /> Serves {spotlight.servings}</span></div>
            <ol className="mt-8 divide-y divide-line border-y border-line">{spotlight.steps_short.slice(0, 3).map((step, index) => <li key={index} className="flex gap-4 py-4"><span className="display text-[20px] text-accent">0{index + 1}</span><span className="line-clamp-2 text-[15px] leading-relaxed text-ink-soft">{step}</span></li>)}</ol>
            <div className="mt-7 flex flex-wrap gap-3"><Link href={`/recipes/${spotlight.slug}`} className="brand-button">Cook this recipe <ArrowRight size={17} /></Link><SaveRecipeButton slug={spotlight.slug} /></div>
          </div>
        </section>

        <HomeFAQ catalogCount={catalogCount} recipeCount={recipeCount} />

        <section className="relative mt-20 overflow-hidden rounded-t-[26px] bg-[#efc448] px-6 py-12 md:mt-28 md:px-12 md:py-16" aria-labelledby="last-call-heading">
          <div className="relative z-10 max-w-[780px]"><p className="text-xs font-bold uppercase tracking-[.18em] text-ink/70">The whole table awaits</p><h2 id="last-call-heading" className="section-title mt-4 max-w-[13ch] text-ink">What are we cooking tonight?</h2><p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink/80">Explore the collection, find a recipe with real steps, or put a week of meals on the calendar.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/recipes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-paper transition-transform hover:-translate-y-0.5">Find a dish <ArrowUpRight size={17} /></Link><Link href="/onboard" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/40 px-6 text-sm font-bold text-ink transition-colors hover:bg-ink/10">Plan my week</Link></div></div>
          <div className="pointer-events-none absolute -bottom-20 -right-12 hidden h-72 w-72 rounded-full border-[28px] border-ink/10 md:block" aria-hidden="true" />
        </section>
      </div>
    </MotionConfig>
  );
}
