import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // F2: never leak the framework banner in response headers.
  poweredByHeader: false,
  images: {
    // Product images are a `URLField` on the backend (backend/products/models.py:7,26)
    // and every seeded value is an Unsplash CDN URL, so one specific hostname covers
    // the whole catalog. Keeping this narrow is the point: a wildcard hostname would
    // turn the Next server into an open image proxy (SSRF / optimizer-exhaustion).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
        // `search` is deliberately OMITTED. Next 16 compares it with strict string
        // equality (next/dist/shared/lib/match-remote-pattern.js:46-50), not as a
        // regex, and every Unsplash URL carries "?w=…&h=…&fit=crop". Copying the
        // docs example's `search: ""` would therefore reject every product image
        // at runtime with a 400 from the image optimizer.
      },
    ],
  },
  // Minimal self-hosted image: trace only the files needed at runtime
  // (frontend/Dockerfile copies .next/standalone into the runner stage).
  output: "standalone",
  async headers() {
    return [
      {
        // Complement the nonce CSP (proxy.ts): standard hardening headers on
        // every response.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // Legacy clickjacking guard; frame-ancestors 'none' in the CSP is
          // authoritative for modern browsers.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
