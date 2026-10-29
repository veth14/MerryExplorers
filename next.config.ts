import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Add 512px breakpoint so logo isn't served at 640px for a 504px slot
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
  },
  experimental: {
    // Faster server-side rendering
    optimizePackageImports: ["mongodb"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow app pages to embed same-origin helpers such as the interactive
          // Little Explorer viewer while continuing to block cross-origin framing.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
