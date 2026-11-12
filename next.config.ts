import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg", "pdfkit"],
  // Files read from disk at run time must be listed so hosted builds include them:
  // certificate fonts, and the database migrations that run when the server starts.
  outputFileTracingIncludes: { "/api/certificates/**": ["./assets/fonts/**"], "/**": ["./drizzle/**/*"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Authenticated areas must never be stored by shared or offline caches.
        source: "/:locale(ar|en)/(dashboard|exam|checkout|company|instructor|admin|settings)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
