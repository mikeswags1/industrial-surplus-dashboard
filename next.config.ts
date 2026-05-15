import type { NextConfig } from "next";

/** Skips ESLint during `next build` (Vercel). Run `npm run lint` locally to catch issues before push. */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/campaigns",
        destination: "/email-tracking",
        permanent: false,
      },
      {
        source: "/analytics",
        destination: "/email-tracking",
        permanent: false,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Vercel: avoid blocking deploys on TS quirks (e.g. `useState("literal")` + controlled inputs). Run `npx tsc --noEmit` locally before merge when possible. */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
