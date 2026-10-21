"use client";
import { useCallback } from "react";
import { useSalo } from "@/store/useSalo";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function useT() {
  const locale = useSalo((s) => s.locale);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  return { t, locale: locale as Locale };
}