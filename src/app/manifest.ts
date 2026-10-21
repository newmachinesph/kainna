import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kain Na!",
    short_name: "Kain Na!",
    description: "Filipino food, recipes, and a meal plan for your family.",
    start_url: "/plan",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4eb",
    theme_color: "#f7f4eb",
    lang: "en",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png?v=20261001-3", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=20261001-3", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png?v=20261001-3", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Plan", url: "/plan", icons: [{ src: "/icons/icon-192.png?v=20261001-3", sizes: "192x192" }] },
      { name: "Market list", url: "/palengke", icons: [{ src: "/icons/icon-192.png?v=20261001-3", sizes: "192x192" }] },
      { name: "Check-in", url: "/checkin", icons: [{ src: "/icons/icon-192.png?v=20261001-3", sizes: "192x192" }] },
    ],
  };
}
