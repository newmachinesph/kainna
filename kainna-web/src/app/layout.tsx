import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { siteUrl } from "@/lib/site";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const body = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Kain Na! | Filipino Recipes & Meal Planning", template: "%s | Kain Na!" },
  description: "Discover Filipino dishes, cook recipes with ingredients and steps, and plan family meals around your budget.",
  applicationName: "Kain Na!",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  manifest: "/manifest.webmanifest?v=20261001-3",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kain Na!" },
  icons: {
    icon: [{ url: "/favicon.ico?v=20261001-3", sizes: "any" }, { url: "/favicon-32.png?v=20261001-3", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png?v=20261001-3", sizes: "180x180" }],
  },
  openGraph: { siteName: "Kain Na!", locale: "en_PH", type: "website", url: siteUrl, title: "Kain Na! | Filipino Recipes & Meal Planning", description: "Discover Filipino dishes, cook recipes with ingredients and steps, and plan family meals around your budget." },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f7f4eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
      <GoogleAnalytics gaId="G-DM58PGSL1G" />
    </html>
  );
}
