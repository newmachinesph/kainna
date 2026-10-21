import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["mysql2"],
  experimental: {
    // Hostinger counts threads against the account's process limit. Next.js would otherwise start a build
    // worker per core (63 there), and sharp an image thread per core.
    cpus: 1,
    imgOptConcurrency: 1,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }],
  },
  async redirects() {
    return [
      { source: "/ulam", destination: "/recipes", permanent: true },
      { source: "/ulam/:path*", destination: "/recipes/:path*", permanent: true },
      { source: "/discover", destination: "/recipes", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      { source: "/favicon.ico", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      { source: "/favicon-32.png", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
