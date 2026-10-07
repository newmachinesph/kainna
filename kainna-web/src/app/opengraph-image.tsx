import { ImageResponse } from "next/og";
import { OG, Wordmark, ogFonts, ogMark } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Kain Na! Filipino recipes and weekly meal planning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [fonts, mark] = await Promise.all([ogFonts().catch(() => []), ogMark()]);
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: OG.paper, fontFamily: "DM Sans", color: OG.ink, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 14, backgroundColor: OG.mustard, display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 760, padding: "64px 0 56px 72px" }}>
        <Wordmark mark={mark} size={40} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: OG.accent }}>Filipino recipes &amp; meal planning</div>
          <div style={{ display: "flex", fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 68, lineHeight: 1.02, letterSpacing: "-0.025em" }}>A week of ulam, pasok sa budget.</div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: OG.inkSoft, maxWidth: 620 }}>1,600+ Filipino dishes with ingredients and steps, plus a weekly plan and palengke list for your family.</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>kainna.ph</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 440, backgroundColor: OG.green }}>
        <img src={mark} alt="" width={300} height={300} style={{ borderRadius: 999 }} />
      </div>
    </div>,
    { ...size, fonts },
  );
}
