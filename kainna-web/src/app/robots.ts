import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site";

// Answer engines are named so each one reads the same policy as everyone else, not a guess from the wildcard.
const answerEngines = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "Google-Extended", "Applebot-Extended", "Bingbot",
];
const disallow = ["/api/", "/v1/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }, { userAgent: answerEngines, allow: "/", disallow }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
