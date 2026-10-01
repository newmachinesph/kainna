"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const questions = (catalogCount: number, recipeCount: number) => [
  {
    id: "recipes",
    question: "Does every food image have a recipe?",
    answer: `The collection currently has ${catalogCount.toLocaleString()} unique dish images and ${recipeCount.toLocaleString()} in-app recipes with ingredients and steps. Other food pages include a link to the publisher's recipe when the catalog provides one.`,
  },
  {
    id: "prices",
    question: "Are the recipe prices live market prices?",
    answer: "No. The costs are estimates based on the app’s ingredient price list. They help you compare meals and plan a budget, but your local palengke prices may differ.",
  },
  {
    id: "plan",
    question: "What happens after I make a meal plan?",
    answer: "You get seven days of dishes and a grouped palengke list based on the plan. You can swap meals and check off what you need to buy.",
  },
  {
    id: "saved",
    question: "Do I need an account to save recipes?",
    answer: "No. As a guest, your saved recipes stay in this browser. If you create an account, Kain Na! stores them in your account so you can sign in again.",
  },
];

export function HomeFAQ({ catalogCount, recipeCount }: { catalogCount: number; recipeCount: number }) {
  return (
    <section id="faq" className="mt-20 grid scroll-mt-28 gap-8 border-t border-line pt-12 md:mt-28 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:gap-16 md:pt-16" aria-labelledby="faq-heading">
      <div><p className="eyebrow">Good to know</p><h2 id="faq-heading" className="section-title mt-3 max-w-[12ch]">Questions before the first bite?</h2><p className="mt-5 max-w-[36ch] text-ink-soft">A few details about recipes, prices, planning, and your saved food.</p></div>
      <Accordion.Root type="single" collapsible className="divide-y divide-line border-y border-line">
        {questions(catalogCount, recipeCount).map(({ id, question, answer }) => <Accordion.Item key={id} value={id} className="group">
          <Accordion.Header className="m-0"><Accordion.Trigger className="flex w-full items-center justify-between gap-5 py-5 text-left text-[17px] font-bold leading-snug text-ink md:py-6 md:text-[20px]"><span>{question}</span><ChevronDown size={21} className="shrink-0 text-accent transition-transform duration-200 group-data-[state=open]:rotate-180" /></Accordion.Trigger></Accordion.Header>
          <Accordion.Content className="faq-content overflow-hidden"><p className="max-w-[64ch] pb-6 pr-10 text-[15px] leading-relaxed text-ink-soft">{answer}</p></Accordion.Content>
        </Accordion.Item>)}
      </Accordion.Root>
    </section>
  );
}
