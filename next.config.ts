import type { NextConfig } from "next";

/** Skips ESLint during `next build` (Vercel). Run `npm run lint` locally to catch issues before push. */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [{ source: "/email", destination: "/send-emails", permanent: false }];
  },
};

export default nextConfig;
