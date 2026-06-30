import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 所有 /api/* 请求转发到后端，避免 CORS
  // 后端地址通过 .env.local 中的 NEXT_PUBLIC_API_BASE 配置
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8009"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
