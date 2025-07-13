import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Ensure webpack doesn't bundle prisma client
  webpack: (config) => {
    config.externals.push("@prisma/client");
    return config;
  },
};

export default nextConfig;
