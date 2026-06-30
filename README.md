# Geesun Agent Web

吉阳智能 AI Agent 平台 — Web 前端（Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui）。

后端对接：`geesun_agent`（FastAPI + SSE 流式 + JWT 认证）。

---

## 开发环境

- Node.js >= 22
- 包管理器：pnpm（沙箱默认）/ bun（宿主机首选）/ npm
- 后端 API 运行于 `http://localhost:8009`

```bash
# 安装依赖
pnpm install

# 启动开发服务器（默认 http://localhost:3000）
pnpm dev
```

## 色彩体系

基于吉阳智能业态（新能源卷绕设备 70%、碟片 10%、激光 20%）及风水五行推导：

| 角色 | 色值 | 五行 | 用途 |
|------|------|------|------|
| 品牌主色 | `#E8491A` | 火 | 主按钮、用户气泡、品牌标识 |
| 强调色 | `#F59E0B` | 金 | 工具卡片、高亮 |
| 背景 | `#FAFAF9` | 土 | 页面基底 |
| 成功 | `#10B981` | 木 | 通过/完成 |
| 信息 | `#3B82F6` | 水 | 水火既济、信息提示 |

详见 `AGENTS.md` → 色彩体系与主题规划。

## 依赖包清单

| 包名 | 版本 | 用途 |
|------|------|------|
| next | 16.2.9 | React 全栈框架（App Router） |
| react | 19.2.4 | UI 框架 |
| react-dom | 19.2.4 | React DOM 渲染 |
| tailwindcss | 4.x | 原子化 CSS 框架 |
| @tailwindcss/postcss | 4.x | Tailwind PostCSS 插件 |
| typescript | 5.x | 类型系统 |
| lucide-react | 0.507.0 | SVG 图标库 |
| shadcn/ui | 4.12.0 | UI 组件库（基于 Radix UI） |
| tw-animate-css | — | Tailwind 动画工具类 |
| eslint | 9.x | 代码检查 |
| eslint-config-next | 16.2.9 | Next.js ESLint 规则 |
| @types/node | 20.x | Node.js 类型 |
| @types/react | 19.x | React 类型 |
| @types/react-dom | 19.x | React DOM 类型 |
| @radix-ui/react-avatar | — | 头像组件（shadcn 依赖） |
| @radix-ui/react-scroll-area | — | 滚动区域组件（shadcn 依赖） |
| @radix-ui/react-separator | — | 分割线组件（shadcn 依赖） |
| @radix-ui/react-dropdown-menu | — | 下拉菜单组件（shadcn 依赖） |
| @radix-ui/react-slot | — | 插槽组件（shadcn 依赖） |
| class-variance-authority | — | 组件变体管理（shadcn 依赖） |
| clsx | — | 类名合并工具 |
| tailwind-merge | — | Tailwind 类名冲突合并 |
