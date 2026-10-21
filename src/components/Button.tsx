"use client";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ink" | "paper";
type Size = "sm" | "md" | "lg";

const base = "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-[background-color,color,transform] duration-150 select-none disabled:opacity-50 active:scale-[0.99]";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-deep",
  secondary: "bg-card text-ink border border-line hover:border-line-strong",
  ghost: "bg-transparent text-ink-soft hover:bg-paper-deep",
  danger: "bg-warn-soft text-warn hover:bg-[#f0d6c2]",
  ink: "bg-ink text-paper hover:bg-ink-soft",
  paper: "bg-paper text-ink hover:bg-white",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, href, children, ...rest }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}