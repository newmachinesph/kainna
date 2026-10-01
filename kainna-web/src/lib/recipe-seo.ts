import { absoluteUrl } from "@/lib/site";

export function recipeSeoTitle(name: string): string {
  return `${name} Recipe: How to Cook It`;
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
