import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
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
  // Use webpack instead of Turbopack for production builds for better compatibility
  // Turbopack has issues with some Node.js packages like @vercel/oidc
  turbopack: false,
};

export default withWorkflow(withBotId(nextConfig));
