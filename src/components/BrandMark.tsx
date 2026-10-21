export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return <img aria-hidden="true" alt="" src="/brand/kain-na-mark.svg?v=20261001-3" width={size} height={size} className={`rounded-full bg-ink ${className}`} />;
}
