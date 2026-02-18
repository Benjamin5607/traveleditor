import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // 깃허브 페이지 배포를 위한 경로 설정
  basePath: '/traveleditor',
  assetPrefix: '/traveleditor',
};

export default nextConfig;