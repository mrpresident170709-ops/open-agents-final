import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  transpilePackages: [
    "streamdown",
    "@streamdown/code",
    "@pierre/diffs",
  ],
  allowedDevOrigins: replitDomain ? [replitDomain, `*.${replitDomain}`] : [],
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
  serverExternalPackages: [
    "@vercel/oidc",
    "jose",
    "arctic",
    "postgres",
    "@octokit/rest",
    "@octokit/auth-app",
  ],
  webpack: (config) => {
    // ESM-only packages (those with only "import" in their exports field,
    // no "require" or "default") cannot be resolved by webpack unless we
    // add "import" as an accepted resolution condition.
    // transpilePackages alone is not enough — webpack must be able to
    // *resolve* a package before it can transpile it.
    config.resolve.conditionNames = [
      ...(config.resolve.conditionNames ?? []),
      "import",
    ];
    return config;
  },
};

export default withWorkflow(withBotId(nextConfig));
