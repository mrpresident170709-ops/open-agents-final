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
};

export default withWorkflow(withBotId(nextConfig));
