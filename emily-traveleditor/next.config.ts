import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/traveleditor',
  trailingSlash: true, // 경로 끝에 / 붙여서 인식률 높임
  images: { unoptimized: true },
};

export default nextConfig;
