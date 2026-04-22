import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  allowedDevOrigins: replitDomain ? [replitDomain, `*.${replitDomain}`] : [],
  transpilePackages: ["streamdown", "@streamdown/code"],
  webpack: (config) => {
    // Allow webpack to resolve ESM-only packages (export conditions with "import" only)
    config.resolve = {
      ...config.resolve,
      conditionNames: ["import", "module", "require", "browser", "default"],
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "vercel.com",
      },
      {
        protocol: "https",
        hostname: "*.vercel.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withWorkflow(withBotId(nextConfig));
