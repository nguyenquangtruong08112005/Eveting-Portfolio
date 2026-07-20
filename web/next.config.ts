import type { NextConfig } from "next";

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
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // camera/geolocation: allow same-origin (check-in QR + venue map "my location").
        // camera=() blocks getUserMedia entirely — browser "Allow" cannot override this.
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(), geolocation=(self)',
        },
      ],
    },
  ],
};

export default nextConfig;
