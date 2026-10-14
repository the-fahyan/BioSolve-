import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy
const cspHeader = [
  "default-src 'self' 'unsafe-inline'",
  // Next.js & React dev mode require 'unsafe-eval'
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https: http: wss: ws:",
  "frame-ancestors 'self' https://*.loca.lt",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  // Allow tunnels (e.g. localtunnel, ngrok) and local IP addresses in dev mode
  allowedDevOrigins: [
    "*.loca.lt",
    "localhost:3000",
    "127.0.0.1:3000",
    "10.251.58.185:3000",
  ],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
