import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/email", destination: "/send-emails", permanent: false }];
  },
};

export default nextConfig;
