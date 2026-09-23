import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // F2: never leak the framework banner in response headers.
  poweredByHeader: false,
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
