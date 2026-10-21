"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { faqQuestions } from "@/lib/faq";

export function HomeFAQ({ catalogCount, recipeCount }: { catalogCount: number; recipeCount: number }) {
  return (
    <section id="faq" className="mt-20 grid scroll-mt-28 gap-8 border-t border-line pt-12 md:mt-28 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:gap-16 md:pt-16" aria-labelledby="faq-heading">
      <div><p className="eyebrow">Good to know</p><h2 id="faq-heading" className="section-title mt-3 max-w-[12ch]">Questions before the first bite?</h2><p className="mt-5 max-w-[36ch] text-ink-soft">A few details about recipes, prices, planning, and your saved food.</p></div>
      <Accordion.Root type="single" collapsible className="divide-y divide-line border-y border-line">
        {faqQuestions(catalogCount, recipeCount).map(({ id, question, answer }) => <Accordion.Item key={id} value={id} className="group">
          <Accordion.Header className="m-0"><Accordion.Trigger className="flex w-full items-center justify-between gap-5 py-5 text-left text-[17px] font-bold leading-snug text-ink md:py-6 md:text-[20px]"><span>{question}</span><ChevronDown size={21} className="shrink-0 text-accent transition-transform duration-200 group-data-[state=open]:rotate-180" /></Accordion.Trigger></Accordion.Header>
          <Accordion.Content className="faq-content overflow-hidden"><p className="max-w-[64ch] pb-6 pr-10 text-[15px] leading-relaxed text-ink-soft">{answer}</p></Accordion.Content>
        </Accordion.Item>)}
      </Accordion.Root>
    </section>
  );
}
