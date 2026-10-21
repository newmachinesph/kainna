import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  variant?: "full" | "thumbnail";
};

/** Select the prebuilt R2 photo sizes and formats without a runtime image service. */
export function FoodImage({ src, variant = "thumbnail", sizes, ...props }: Props) {
  if (!/\/full\/[^/]+\.webp(?:[?#]|$)/.test(src)) {
    return <img src={src} sizes={sizes} {...props} />;
  }

  const thumbnailWebp = src.replace("/full/", "/thumbnail/");
  const toAvif = (url: string) => url.replace(/\.webp(?=[?#]|$)/, ".avif");
  const displayWebp = variant === "full" ? src : thumbnailWebp;
  const displayAvif = toAvif(displayWebp);
  const responsiveSizes = sizes ?? "(max-width: 768px) 50vw, 25vw";

  return (
    <picture className="block h-full w-full">
      <source
        type="image/avif"
        srcSet={variant === "full" ? displayAvif : `${displayAvif} 640w, ${toAvif(src)} 1200w`}
        sizes={variant === "full" ? undefined : responsiveSizes}
      />
      <img
        src={displayWebp}
        srcSet={variant === "full" ? undefined : `${thumbnailWebp} 640w, ${src} 1200w`}
        sizes={variant === "full" ? undefined : responsiveSizes}
        {...props}
      />
    </picture>
  );
}
