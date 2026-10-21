import type { DayKey, Locale } from "./types";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_NAMES: Record<Locale, Record<DayKey, [string, string]>> = {
  tl: {
    mon: ["Lunes", "Lun"], tue: ["Martes", "Mar"], wed: ["Miyerkules", "Miy"],
    thu: ["Huwebes", "Huw"], fri: ["Biyernes", "Biy"], sat: ["Sabado", "Sab"], sun: ["Linggo", "Lin"],
  },
  en: {
    mon: ["Monday", "Mon"], tue: ["Tuesday", "Tue"], wed: ["Wednesday", "Wed"],
    thu: ["Thursday", "Thu"], fri: ["Friday", "Fri"], sat: ["Saturday", "Sat"], sun: ["Sunday", "Sun"],
  },
  ceb: {
    mon: ["Lunes", "Lun"], tue: ["Martes", "Mar"], wed: ["Miyerkules", "Miy"],
    thu: ["Huwebes", "Huw"], fri: ["Biyernes", "Biy"], sat: ["Sabado", "Sab"], sun: ["Dominggo", "Dom"],
  },
};

const MONTHS: Record<Locale, string[]> = {
  tl: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ceb: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"],
};

export function dayName(day: DayKey, locale: Locale = "tl", short = false): string {
  return DAY_NAMES[locale][day][short ? 1 : 0];
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

/** The plan week is the Monday-to-Sunday week that the most recent Saturday send covers. */
export function currentPlanWeek(now = new Date()): string {
  const dow = now.getDay();
  if (dow === 6) return weekStartOf(shift(now, 2));
  if (dow === 0) return weekStartOf(shift(now, 1));
  return weekStartOf(now);
}

function shift(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekDates(weekStart: string): { day: DayKey; date: string }[] {
  return DAY_KEYS.map((day, i) => ({ day, date: addDays(weekStart, i) }));
}

export function formatDate(iso: string, locale: Locale = "tl", withYear = false): string {
  const d = parseISODate(iso);
  const m = MONTHS[locale][d.getMonth()];
  return withYear ? `${m} ${d.getDate()}, ${d.getFullYear()}` : `${m} ${d.getDate()}`;
}

export function formatRange(weekStart: string, locale: Locale = "tl"): string {
  const end = addDays(weekStart, 6);
  const a = parseISODate(weekStart);
  const b = parseISODate(end);
  const ma = MONTHS[locale][a.getMonth()];
  const mb = MONTHS[locale][b.getMonth()];
  if (ma === mb) return `${ma} ${a.getDate()}–${b.getDate()}`;
  return `${ma} ${a.getDate()} – ${mb} ${b.getDate()}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}

export function isPast(iso: string, now = new Date()): boolean {
  return parseISODate(iso).getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function isToday(iso: string, now = new Date()): boolean {
  return iso === toISODate(now);
}

/** Days within `window` days before a pay date (kinsenas / katapusan) are lean days. */
export function isLeanDay(iso: string, payDates: number[], window = 3): boolean {
  const d = parseISODate(iso);
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  for (const p of payDates) {
    const payDay = Math.min(p, lastOfMonth);
    const diff = payDay - d.getDate();
    if (diff >= 1 && diff <= window) return true;
  }
  return false;
}

export function nextPayday(iso: string, payDates: number[]): string {
  const d = parseISODate(iso);
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const candidates = payDates.map((p) => Math.min(p, lastOfMonth)).filter((p) => p >= d.getDate());
  if (candidates.length) {
    return toISODate(new Date(d.getFullYear(), d.getMonth(), Math.min(...candidates)));
  }
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const nextLast = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  const day = Math.min(...payDates.map((p) => Math.min(p, nextLast)));
  return toISODate(new Date(next.getFullYear(), next.getMonth(), day));
}

export function todayISO(): string {
  return toISODate(new Date());
}