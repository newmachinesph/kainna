import { absoluteUrl } from "@/lib/site";

const MAX_TITLE_LENGTH = 60;

/** Adds the English name when it differs from the dish name and the title still fits a search result. */
export function recipeSeoTitle(name: string, englishName?: string | null): string {
  const plain = `${name} Recipe: How to Cook It`;
  const english = englishName?.trim();
  if (!english || name.toLowerCase().includes(english.toLowerCase())) return plain;
  const withEnglish = `${name} Recipe (${english}): How to Cook It`;
  return withEnglish.length <= MAX_TITLE_LENGTH ? withEnglish : plain;
}

/** "crisp banana rolls" -> "Crisp Banana Rolls", for English names used in titles. */
export function titleCase(text: string): string {
  return text.replace(/\b([a-z])([a-z]*)/g, (word, first: string, rest: string) => ["and", "or", "of", "with", "in", "na", "ng"].includes(word) ? word : first.toUpperCase() + rest);
}

export function recipeSeoDescription(summary: string, detail: string): string {
  const lead = summary.replace(/\s+/g, " ").trim();
  const text = `${lead} ${detail.trim()}`.replace(/\s+/g, " ").trim();
  if (text.length <= 155) return text;
  if (lead.length <= 155) return lead;
  const prefix = lead.slice(0, 154).replace(/\s+\S*$/, "");
  return `${prefix || lead.slice(0, 154)}…`;
}

export function recipeSocialImage(kind: "ulam" | "merienda" | "catalog", id: string): string {
  return absoluteUrl(`/og/recipe/${kind}/${encodeURIComponent(id)}`);
}
