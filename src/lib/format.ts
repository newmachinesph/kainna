export function roundToFive(amount: number): number {
  if (amount === 0) return 0;
  const rounded = Math.round(Math.abs(amount) / 5) * 5;
  return Math.sign(amount) * Math.max(5, rounded);
}

export function peso(amount: number): string {
  return "₱" + roundToFive(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

export function qtyLabel(qty: number, unit: string): string {
  if (unit === "kg") {
    if (qty < 1) return `${Math.round(qty * 1000)} g`;
    return `${trim(qty)} kg`;
  }
  if (unit === "pc") return `${Math.ceil(qty)} pc`;
  if (unit === "bundle") return `${Math.ceil(qty)} tali`;
  if (unit === "bottle" || unit === "jar" || unit === "can" || unit === "pack") {
    const n = Math.ceil(qty);
    return `${n} ${unit}${n > 1 ? "s" : ""}`;
  }
  return `${trim(qty)} ${unit}`;
}

function trim(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function minutes(m: number): string {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  }
  return `${m} min`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
