import type { NextConfig } from "next";

const appContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' https: data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
].join("; ");

const embedContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self' https: data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
].join("; ");

const sharedSecurityHeaders = [
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
];

const appSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: appContentSecurityPolicy,
  },
  ...sharedSecurityHeaders,
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const embedSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: embedContentSecurityPolicy,
  },
  ...sharedSecurityHeaders,
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: embedSecurityHeaders,
      },
      {
        source: "/((?!embed(?:/|$)).*)",
        headers: appSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
