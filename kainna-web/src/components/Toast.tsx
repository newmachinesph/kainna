"use client";
import { useEffect } from "react";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";

export function Toast() {
  const toast = useSalo((s) => s.toast);
  const clear = useSalo((s) => s.clearToast);
  const { t } = useT();
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clear, 2600);
    return () => clearTimeout(id);
  }, [toast, clear]);
  if (!toast) return null;
  const text = toast.text.startsWith("toast.") || toast.text.includes(".") && !toast.text.includes(" ") ? t(toast.text) : toast.text;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
      <div key={toast.id} className="pop rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lift">{text}</div>
    </div>
  );
}