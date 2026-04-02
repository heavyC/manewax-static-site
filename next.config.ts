import path from "node:path";
import type { NextConfig } from "next";

const localApiPort = process.env.LOCAL_API_PORT?.trim() || "3001";
const localApiBaseUrl = (process.env.LOCAL_API_BASE_URL?.trim() || `http://localhost:${localApiPort}`).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

if (process.env.NODE_ENV === "development") {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: `${localApiBaseUrl}/api/:path*`,
    },
  ];
}

export default nextConfig;
