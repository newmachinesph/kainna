import { BrandMark } from "./BrandMark";

export function Wordmark({ className = "", size = 22, onDark = false }: { className?: string; size?: number; onDark?: boolean }) {
  return (
    <span className={`display inline-flex items-center gap-[9px] leading-none ${className}`} style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.045em" }}>
      <BrandMark size={Math.round(size * 1.35)} />
      <span>Kain <span className={onDark ? "text-[#efc448]" : "text-accent"}>Na!</span></span>
    </span>
  );
}
