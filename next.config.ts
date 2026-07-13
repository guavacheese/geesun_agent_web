import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 所有 /api/* 请求转发到后端，避免 CORS
  // 后端地址通过 .env.local 中的 NEXT_PUBLIC_API_BASE 配置
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8009"}/api/:path*`,
        // 显式透传认证相关 header 到后端
        // Next.js 默认会剥离自定义 header，需要在 rewrites 中显式声明
        // 见：https://nextjs.org/docs/app/api-reference/next-config-js/rewrites#headers
        headers: [
          { key: "Authorization", value: ":authorization" },
          { key: "Cookie", value: ":cookie" },
        ],
      },
    ];
  },
};

export default nextConfig;
