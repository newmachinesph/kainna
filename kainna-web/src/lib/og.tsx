import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared pieces for social (Open Graph) images, matching the site's brand: cream paper, deep green ink, terracotta and mustard. */
export const OG = { paper: "#f7f4eb", ink: "#20372e", inkSoft: "#4b5b50", muted: "#6f776e", accent: "#c64d35", mustard: "#efc448", green: "#0f241b" };

type Font = { name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: "normal" };
let fontsPromise: Promise<Font[]> | undefined;
let markPromise: Promise<string> | undefined;

async function fetchTtf(family: string, weight: 500 | 700 | 800): Promise<ArrayBuffer> {
  // An old user agent makes Google Fonts answer with plain TTF files, which next/og can embed.
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:1.0) Gecko/20100101" } }).then((r) => r.text());
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`No TTF for ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

/** Bricolage Grotesque for display text and DM Sans for body, the same pairing as the site. Cached per server instance. */
export function ogFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    fetchTtf("Bricolage+Grotesque", 800).then((data) => ({ name: "Bricolage Grotesque", data, weight: 800 as const, style: "normal" as const })),
    fetchTtf("DM+Sans", 500).then((data) => ({ name: "DM Sans", data, weight: 500 as const, style: "normal" as const })),
    fetchTtf("DM+Sans", 700).then((data) => ({ name: "DM Sans", data, weight: 700 as const, style: "normal" as const })),
  ]).catch((error) => { fontsPromise = undefined; throw error; });
  return fontsPromise;
}

/** The plate-and-K brand mark as a data URL. */
export function ogMark(): Promise<string> {
  markPromise ??= readFile(join(process.cwd(), "public", "brand", "kain-na-mark.svg"), "utf8").then((svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  return markPromise;
}

export function Wordmark({ mark, size = 34 }: { mark: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.35), fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: size, letterSpacing: "-0.04em", color: OG.ink }}>
      <img src={mark} alt="" width={Math.round(size * 1.35)} height={Math.round(size * 1.35)} style={{ borderRadius: 999, backgroundColor: OG.ink }} />
      <div style={{ display: "flex" }}>Kain&nbsp;<span style={{ color: OG.accent }}>Na!</span></div>
    </div>
  );
}
