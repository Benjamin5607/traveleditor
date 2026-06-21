import type { NextConfig } from "next";

const repoBase = "/traveleditor";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoBase,
  assetPrefix: repoBase,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
