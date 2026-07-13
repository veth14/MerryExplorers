import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // Faster server-side rendering
    optimizePackageImports: ["mongodb"],
  },
};

export default nextConfig;
