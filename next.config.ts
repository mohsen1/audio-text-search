import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Ensure webpack doesn't bundle prisma client
  webpack: (config) => {
    config.externals.push("@prisma/client");
    return config;
  },
  // Disable linting during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
