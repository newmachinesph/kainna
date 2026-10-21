"use client";
import { useState } from "react";
import type { Dish } from "@/lib/types";
import { cn } from "@/lib/format";
import { FoodImage } from "./FoodImage";

const CLASS_TINT: Record<string, string> = {
  manok: "#efe3c8", baboy: "#ecd9cf", baka: "#e6d2c9", isda: "#d9e3e6", hipon: "#e9dbd3",
  itlog: "#f2e8c4", gulay: "#d9e6d2", delata: "#e3ddd3", pancit: "#eee2cc",
};

export function DishPhoto({ dish, className, sizes, priority }: { dish: Dish; className?: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const show = dish.image && !failed;
  return (
    <div className={cn("photo", className)} style={{ background: CLASS_TINT[dish.protein_class] ?? "#e7dfd0" }} aria-hidden={show ? undefined : true}>
      {show ? (
        <FoodImage
          src={dish.image as string}
          alt={dish.name_tl}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="display text-ink/40" style={{ fontSize: "clamp(18px, 40%, 44px)" }}>
            {initials(dish.name_tl)}
          </span>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Photo({ src, alt, className, credit }: { src: string; alt: string; className?: string; credit?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("photo", className)}>
      {!failed && <FoodImage src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
      {credit && !failed && (
        <span className="absolute bottom-1 right-2 text-[10px] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{credit}</span>
      )}
    </div>
  );
}
