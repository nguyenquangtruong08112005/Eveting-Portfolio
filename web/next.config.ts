import type { NextConfig } from "next";

/** Grafana origin for admin iframe embed (local default :3301). */
const grafanaOrigin =
  process.env.NEXT_PUBLIC_GRAFANA_URL?.replace(/\/$/, "") ||
  "http://localhost:3301";

const nextConfig: NextConfig = {
  // Required for web/Dockerfile multi-stage standalone image
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'tkbcdn.com',
      },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // Page cannot be framed by others; we still allow *this* app to iframe Grafana via CSP frame-src.
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // camera/geolocation: allow same-origin (check-in QR + venue map "my location").
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(), geolocation=(self)',
        },
        // Admin Observability embeds Grafana; keep frame-src tight.
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' data:",
            "connect-src 'self' http: https: ws: wss:",
            "media-src 'self' blob:",
            "worker-src 'self' blob:",
            `frame-src 'self' ${grafanaOrigin}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ],
};

export default nextConfig;
