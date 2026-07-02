# Geesun Agent Web — 前端工程规划

## 项目概述

为 geesun_agent（AI Agent 平台）构建一个 Web 前端界面，对标 DeepSeek/ChatGPT 网页版的聊天交互体验。
后端 API 已在 `geesun_agent` 项目中完成（FastAPI + SSE 流式 + JWT 认证 + 会话管理），
前端需要与之对接，提供完整的对话式 AI 交互 UI。

---

## 技术栈约束（强制）

| 项目 | 要求 |
|---|---|
| 框架 | **Next.js 16.2.9+**（必须使用 App Router，不支持 Pages Router） |
| 语言 | TypeScript（严格模式） |
| 渲染 | 使用 React Server Components (RSC)，客户端交互部分用 `"use client"` |
| 打包 | Turbopack（Next.js 16 默认） |
| 样式 | Tailwind CSS **v4**（CSS-first 配置，无需 `tailwind.config.ts`） |
| UI 组件库 | **shadcn/ui**（基于 Radix UI 原语的 Tailwind 组件库，与 Next.js 16 + Tailwind 原生集成） |
| 图标库 | **lucide-react**（shadcn/ui 默认图标搭档，React 生态最主流的图标库，Tree-shakable） |
| 包管理器 | **pnpm**（沙箱内默认可用）或 **bun**（宿主机首选，需自行安装）或 **npm** |
| MCP | `next-devtools` MCP 服务需配置并启用，用于开发中的架构检查与代码生成 |

> **关于图标库的说明**：Next.js 16 官方文档未指定特定图标或 UI 组件库，保持框架中立。
> `lucide-react` 和 `shadcn/ui` 是 Next.js 生态中 2025-2026 年的行业惯例，shadcn/ui 的 create 引导中也默认集成 lucide-react。

### Next.js 16 架构基准

根据 Next.js 16（v16.2.9+）官方规范，开发必须遵循：

1. **App Router** — 所有路由使用 `app/` 目录，文件系统路由约定（`page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`）
2. **React Server Components 优先** — 默认无客户端交互的组件用 RSC，仅在需要 `useState`/`useEffect`/`onClick` 等浏览器 API 时加 `"use client"`
3. **Server Actions** — 数据变更（创建会话、删除会话等）使用 Server Actions 而非 API 路由
4. **流式渲染** — 利用 `loading.tsx` 和 `Suspense` 处理异步加载状态
5. **内置 MCP 支持** — Next.js 16 在 `/_next/mcp` 暴露 MCP 端点，开发中可实时检查路由状态、组件树、运行时诊断

---

## 后端 API 接口（对接参考）

后端运行于 `http://localhost:8009`，以下为前端需要对接的接口：

### 认证
```
POST /api/v1/auth/login      { "username": "...", "password": "..." }
                              → { "access_token": "...", "token_type": "bearer", "user": {...} }
```

### 会话管理
```
GET    /api/v1/sessions                   → [{ "id": "...", "title": "...", "pinned": false, ... }]
POST   /api/v1/sessions                   → { "id": "...", "title": "..." }
PATCH  /api/v1/sessions/{id}/pin          → { "session_id": "...", "pinned": true, ... }
PATCH  /api/v1/sessions/{id}/unpin        → { "session_id": "...", "pinned": false, ... }
DELETE /api/v1/sessions/{id}              → { "ok": true }
GET    /api/v1/sessions/{id}/messages     → [{ "role": "user"|"ai"|"tool", "content": "...", ... }]
```

### 聊天（SSE 流式）
```
POST /api/v1/chat
Authorization: Bearer <token>
Body: {
  "session_id": "...",
  "message": "...",
  "model_override": {...},     // 可选，动态切换模型
  "files": ["/uploads/..."]     // 可选，本轮上传的文件路径列表
}

SSE 事件流：
  data: {"type":"agent_status","status":"thinking"}
  data: {"type":"token","content":"正在分析..."}
  data: {"type":"tool_call","tool":"read_file","args":{...},"id":"..."}
  data: {"type":"agent_status","status":"running_tool","tool":"read_file"}
  data: {"type":"tool_result","tool":"read_file","success":true,"error":null}
  data: {"type":"token","content":"分析结果如下..."}
  data: [DONE]
```

---

## 前端组件结构

```
geesun_agent_web/
├── app/
│   ├── layout.tsx              ← 根布局（全局样式、AuthProvider 包裹）
│   ├── page.tsx                ← / → 重定向到 /chat
│   ├── login/
│   │   ├── page.tsx            ← 登录页
│   │   └── login-form.tsx      ← "use client" 登录表单组件
│   └── chat/
│       ├── layout.tsx          ← /chat 布局（AuthGuard 包裹，验证 JWT）
│       ├── page.tsx            ← /chat 主页面（服务器组件骨架 + 客户端入口）
│       └── components/
│           ├── ChatShell.tsx        ← "use client" — 左右布局容器，管理全局状态
│           ├── SessionList.tsx      ← 左侧会话列表（可新建、切换、删除）
│           ├── SessionItem.tsx      ← 单条会话卡片（标题 + 时间 + 删除按钮）
│           ├── ChatArea.tsx         ← 右侧聊天区域（消息列表 + 输入框）
│           ├── MessageList.tsx      ← 消息列表（自动滚动到最新）
│           ├── MessageItem.tsx      ← 单条消息渲染（区分 user/ai/tool 角色）
│           ├── MessageInput.tsx     ← 底部输入框（发送消息 + 模型切换按钮）
│           ├── AgentStatusBar.tsx   ← Agent 状态指示条（thinking / running_tool / idle）
│           └── ToolCallCard.tsx     ← 工具调用卡片（工具名、参数、成功/失败状态）
├── components/
│   └── ui/                      ← shadcn/ui 组件（通过 `npx shadcn add` 添加）
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...                  ← 按需添加
├── lib/
│   ├── api-client.ts           ← 封装 HTTP 请求（fetch + JWT auth header）
│   ├── sse-client.ts           ← SSE 流式事件解析器（EventSource / fetch ReadableStream）
│   ├── auth.ts                 ← 认证工具（token 存储、解析、刷新）
│   ├── types.ts                ← 类型定义（Session, Message, SSEMessage, User 等）
│   └── utils.ts                ← shadcn/ui 工具函数（cn() 类名合并）
├── public/
│   └── favicon.ico
├── components.json             ← shadcn/ui 配置文件
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── AGENTS.md                   ← 本文件
```

---

## 组件详细规划

### 1. AuthProvider & 登录（P2）

- **登录页** `/login` — 用户名/密码表单，调用 `POST /api/v1/auth/login`
- JWT token 存储在 `localStorage`，每次请求自动附加 `Authorization: Bearer <token>`
- 全局 `AuthProvider` 包裹根布局，检测 token 是否存在/过期
- 未认证自动跳转到 `/login`

### 2. 左侧会话列表 — SessionList（P4）

- 加载时调用 `GET /api/v1/sessions` 获取会话列表
- pinned 会话在顶部 "已固定" 分组中，带 📌 图标，按 pin 时间排序
- 未固定会话按 `updated_at` 倒序排在下方
- 每条会话 hover 时显示 pin/unpin 按钮和删除按钮
- 点击切换当前会话（更新右侧消息区域）
- 新建会话按钮 → `POST /api/v1/sessions` → 加入列表并自动激活
- pin 按钮 → `PATCH /api/v1/sessions/{id}/pin` → 移到 pinned 分组
- unpin 按钮 → `PATCH /api/v1/sessions/{id}/unpin` → 回到普通分组
- 删除按钮（确认后）→ `DELETE /api/v1/sessions/{id}` → 从列表移除
- 当前高亮选中的会话

### Pin 数据存储
- 后端复用 LangGraph PostgresStore，在 session dict 中加 `pinned: bool` 和 `pinned_at` 字段
- 无需新建数据库表，持久化逻辑与现有 session 存储一致
- 列表排序：`pinned` 优先 → `updated_at` 倒序

### 2.5. 左侧 Skill 区域（P6）

Skill 区域位于 pinned 会话上方，展示当前用户可用的所有 skill。

#### 数据源
Skill 以文件系统目录存储，后端已有接口：
```
GET    /api/v1/skills?user_id=XXX                → {system: [...], agent: [...], user: [...]}
POST   /api/v1/skill/upload                      → 上传 zip 包或多文件
DELETE /api/v1/skill/{name}?user_id=XXX           → 删除用户上传的 skill
```
新增接口：
```
GET    /api/v1/skill/{name}/files?user_id=XXX      → 浏览 skill 内文件列表
GET    /api/v1/skill/{name}/file?user_id=XXX&path= → 读取单个文件内容
```

#### 分类展示
| 分类 | 来源 | 权限 |
|------|------|------|
| 🏭 系统预装 | `/skills/__system__/` | 只读，不可删 |
| 🤖 Agent 自创 | `/skills/__agent__/` | 只读，不可删 |
| 👤 用户上传 | `/skills/__user_{id}__/` | 可浏览、可删除、可上传 |

#### 功能
- 默认折叠，点击分类展开
- 展开后显示 skill 列表（名称 + 描述）
- 点击 skill 展开文件列表（调用 `/files` 端点）
- 点击文件显示内容预览（调用 `/file` 端点，只读弹窗）
- 用户上传的分类有 + 上传按钮和 🗑 删除按钮
- 上传弹窗：支持选择 zip 包或多个文件

#### 侧栏布局
```
┌─────────────────────┐
│ 🧩 Skills        +  │  ← 上传按钮（仅用户分类展开时显示）
│   🤖 Agent 自创 (3)  │
│     └ weather-checker│
│        └ SKILL.md    │
│        └ scripts/    │
│   👤 用户上传 (2)  🗑│
│     └ plc-auditor    │
│   🏭 系统预装 (1)    │
├─────────────────────┤
│ 📌 已固定           │
│   📌 汉中天气...    │
├─────────────────────┤
│ 💬 新对话           │
└─────────────────────┘
```

### 文件上传（P7）
```
POST /api/v1/upload?user_id=XXX&session_id=YYY  → {"uploaded": [{"filename":"...", "path":"/uploads/..."}]}
```

上传文件存到 `/uploads/{user_id}/{session_id}/`，返回虚拟路径。前端在输入框上方显示文件 chips，发送时把路径列表放入 ChatRequest 的 `files` 字段。后端将本轮文件列表注入 user message，Agent 通过 read_file / ls 等工具精确处理本轮文件。

### 模型切换（P7）

- 输入框左侧加模型下拉，支持内置模型和自定义模型
- 自定义模型存 localStorage（`geesun_models`），包含 `model_name`、`base_url`、`api_key`
- 选中非默认模型时，发送请求带 `model_override`
- 后端 `switch_model` middleware 从 runtime context 读取并动态切换

### 3. 右侧聊天区域 — ChatArea / MessageList（P3）

- 切换会话时调用 `GET /api/v1/sessions/{id}/messages` 加载历史消息
- 消息气泡区分角色：
  - **用户消息** — 右对齐，蓝色/品牌色背景
  - **Agent 回答** — 左对齐，浅灰/白色背景
  - **Tool 消息** — 不在消息流中独立渲染，而是通过 ToolCallCard 嵌入（见下文）
- 消息列表自动滚动到最新

### 3.5. 消息操作 — MessageItem 悬停按钮与编辑（P7）

- **hover 用户消息**：右下角浮出 Copy + Edit 图标
- **hover Agent 消息**：垂直居中出现 Copy 图标
- **Copy**：将消息内容写入剪贴板
- **Edit**：用户消息进入可编辑状态，底部显示 Cancel / Send
- **编辑保存后**：
  1. 调用 `POST /api/v1/sessions/{id}/edit` 截断编辑位置之后的所有消息
  2. 替换最后一条用户消息为编辑后的内容
  3. 前端刷新消息列表（保留到编辑点的历史）
  4. 自动重新调用 `POST /api/v1/chat` 生成新的 Agent 回复

新增接口：
```
POST /api/v1/sessions/{id}/edit
Body: { "from_index": 3, "new_message": "编辑后的内容" }
```

后端处理：
- 通过 LangGraph `graph.aupdate_state` 修改 checkpoint 中的 messages 列表：
  - 只保留 `from_index` 之前的消息
  - 将索引 `from_index` 处的用户消息替换为 `new_message`
- 同时同步更新 PostgresStore 中 `("messages", user_id, session_id)` 命名空间下的消息列表，
  保证 `GET /sessions/{id}/messages` 立即返回截断后的历史
- 前端刷新消息后，调用 `POST /api/v1/chat` 并带 `continue_from_state: true`，
  后端不再新增用户消息，而是直接从当前 checkpoint 继续生成 Agent 回复

### 4. 底部输入框 — MessageInput（P3）

- 文本输入框 + 发送按钮（Enter 或点击发送）
- 可选：模型切换下拉按钮（对应 `model_override` 参数）
- 发送后：
  1. 立即显示用户消息气泡
  2. 发起 SSE 连接 `POST /api/v1/chat`
  3. 输入框清空并禁用，等待流结束

### 5. SSE 流处理（核心 — P2/P3 重叠）

使用 `EventSource` 或 `fetch` + `ReadableStream` 解析 SSE 事件：

| SSE 事件 type | 前端处理 |
|---|---|
| `agent_status` | 更新 `AgentStatusBar`（thinking / running_tool） |
| `token` | 追加到当前 AI 回答的文本内容（流式逐字渲染） |
| `tool_call` | 渲染 `ToolCallCard` 卡片（工具名 + 参数） |
| `tool_result` | 更新对应 `ToolCallCard` 的成功/失败状态 |
| `[DONE]` | 结束流，刷新会话消息列表，启用输入框 |

### 6. Agent 状态指示条 — AgentStatusBar（P5）

显示 Agent 当前状态：
- **idle**（空闲）— 隐藏或显示 "就绪"
- **thinking** — 旋转动画 + "Agent 正在思考..."
- **running_tool** — 进度指示 + "正在执行: read_file"

状态条位置：消息列表顶部或底部输入框上方。

### 7. 工具调用卡片 — ToolCallCard（P5）

展示 Agent 执行的工具调用：
```
┌─────────────────────────────────────┐
│ 🔧 read_file                        │  ← 工具名称 + 图标
│ 📄 /uploads/xxx/1111-IO表.xml       │  ← 参数（关键参数摘要）
│                                     │
│ ⏳ 执行中...                        │  ← tool_call 刚发出
│ ✅ 执行成功                         │  ← tool_result success
│ ❌ 执行失败: 文件未找到             │  ← tool_result error
└─────────────────────────────────────┘
```

---

## 消息渲染样式参考图

```
┌─────────────────────────────────────────┐
│  SessionList    │                       │
│  ┌────────────┐ │  [用户消息]            │ ← 右对齐，蓝色背景
│  │ PLC 代码审查│ │                       │
│  │ 天气查询    │ │  🔧 Agent 正在思考... │ ← AgentStatusBar
│  │ 测试会话    │ │  ┌─────────────────┐  │
│  └────────────┘ │  │ 📂 glob          │  │ ← ToolCallCard
│                 │  │ /uploads/xxx/    │  │
│  [+ 新会话]     │  └─────────────────┘  │
│                 │  ✅ glob 成功          │ ← 状态更新
│                 │                       │
│                 │  [Agent 回答内容...]   │ ← 左对齐，白色背景
│                 │  [更多回答内容...]     │
│                 │                       │
│                 │  ──────────────────── │
│                 │  [ 输入消息... ] [发送] │ ← MessageInput + 按钮
└─────────────────────────────────────────┘
```

---

## 开发与部署约束

### 开发环境
- Node.js >= 22（推荐使用 WorkBuddy 管理的 22.22.2）
- 包管理器：
  - **沙箱内（WorkBuddy 项目初始化）**：优先用 `pnpm`（已内置可用），`bun` 在沙箱中不可用
  - **宿主机（你本地开发）**：首选 `bun`（安装最快），备选 `pnpm` / `npm`；三选一即可，锁文件格式不同但不影响项目运行
- 后端必须同时运行（`http://localhost:8009`），开发时配置 `NEXT_PUBLIC_API_BASE=http://localhost:8009`
- 启动命令：
  ```bash
  # 安装依赖（沙箱初始化走 pnpm，宿主机三选一）
  pnpm install     # 沙箱默认
  bun install      # 宿主机首选（需自行安装 bun）
  npm install      # 兜底

  # 开发服务器（默认端口 3000）
  pnpm dev         # 沙箱内
  bun run dev      # 宿主机（需 bun）
  ```

### MCP 配置
在项目根目录添加 `.workbuddy/mcp.json` 启用 next-devtools：
```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

### CORS 说明
后端 FastAPI 已配置 CORS 允许 `http://localhost:3000`，可以直接跨域调用 API。
详见 `src/server.py` 中的 `CORSMiddleware` 配置。

### 依赖包记录（强制）

每次通过 `pnpm add` / `bun add` / `npm install` 安装新包后，**必须**同步更新项目根目录的 `README.md`，在「依赖包清单」章节记录：

- **包名** + **版本号** + **用途（一句话）**

目的：项目开发完成后，可以直接从 README.md 了解项目使用了哪些三方包及其用途，无需翻 `package.json` 逐一排查。

```markdown
# README.md 示例

## 依赖包清单

| 包名 | 版本 | 用途 |
|---|---|---|
| next | 16.x | React 全栈框架 |
| tailwindcss | 4.x | 原子化 CSS 框架 |
| lucide-react | latest | SVG 图标库 |
| ... | ... | ... |
```

> `package.json` 中的 `dependencies` 和 `devDependencies` 是自动维护的，README.md 中的清单是**人工维护的说明文档**，每次装包后立即追加一行。

---

## 实施优先级

| 阶段 | 内容 | 依赖 |
|---|---|---|
| P0 | 项目初始化（Next.js 16 App Router + Tailwind + TypeScript 严格模式 + shadcn/ui 初始化 + lucide-react） | — |
| P1 | 基础框架：AuthProvider + 登录页 + ChatShell 左右布局 | P0 |
| P2 | 聊天核心：SSE 流处理 + MessageList + MessageItem + MessageInput | P1 |
| P3 | 工具调用：ToolCallCard + AgentStatusBar + 状态联动 | P2 |
| P4 | 会话管理：SessionList + 新建/切换/删除对话 | P1 |
| P5 | 增强体验：模型切换、错误边界、加载骨架屏、暗色模式 | P3+P4 |

---

## 色彩体系与主题规划

### 公司业态与五行分析

吉阳智能主营新能源电池制造装备：

| 业务线 | 占比 | 核心工序 | 五行归属 |
|---|---|---|---|
| 新能源卷绕设备 | 70% | 铜/铝箔精密卷绕成电池极片 | **金**（箔材、精密卷绕）+ **火**（电池储能、能源） |
| 碟片设备 | 10% | 极片层叠堆垛 | **金**（精密叠加）+ **土**（堆叠、层叠） |
| 激光设备 | 20% | 激光切割/焊接 | **火**（光束能量）+ **金**（精密切割） |

五行综合权重：**金 40% · 火 30% · 土 10% · 水 10% · 木 10%**

### 命名风水与色彩推导

"**吉阳**"二字自含五行：**阳 = 火**（太阳、光明、能量），**吉 = 土**（吉祥、稳重）。

火生土——名字本身就形成相生格局，这是非常有利的搭配。

结合业务（金火为主）与命名（火土相生），整体五行流转路径为：
> **火（品牌能量）→ 生土（稳重基底）→ 生金（精密制造）**

风水色彩映射：
- **火** → 红色、橙色、紫色、暖珊瑚色
- **土** → 黄色、棕色、米色、暖灰色
- **金** → 白色、金色、银色、琥珀色

> **设计原则**：以火之色（橙红暖调）为品牌主色，体现新能源的活力与动力；以土之色（暖灰/大地色）为界面基底，体现工业制造的稳重可靠；以金之色（琥珀金）为交互点缀，呼应精密设备的品质感。

---

### 亮色模式（Light Mode）色彩方案

```
┌─────────────────────────────────────────────────────────────┐
│ 色彩角色         色值         Tailwind Token      风水五行   │
├─────────────────────────────────────────────────────────────┤
│ 品牌主色        #E8491A     primary / orange-600   火       │
│ 品牌主色(浅)    #FDF2EE     primary-50            火       │
│ 品牌主色(悬停)  #D0380E     primary-700           火       │
│ 品牌主色(文字上)#FFFFFF     primary-foreground     —       │
├─────────────────────────────────────────────────────────────┤
│ 强调色(琥珀金)  #F59E0B     accent / amber-500     金       │
│ 强调色(浅)      #FFFBEB     accent-50             金       │
├─────────────────────────────────────────────────────────────┤
│ 页面背景        #FAFAF9     background             土(暖白) │
│ 卡片/侧栏背景   #FFFFFF     card                   金(白)   │
│ 边框            #E7E5E4     border                 土(暖灰) │
│ 输入框背景      #F5F5F4     muted                  土       │
├─────────────────────────────────────────────────────────────┤
│ 文字-主         #1C1917     foreground             土(暖黑) │
│ 文字-辅         #78716C     muted-foreground       土       │
│ 文字-弱         #A8A29E     —                     土       │
├─────────────────────────────────────────────────────────────┤
│ 成功状态        #10B981     success / emerald-500   木(生长) │
│ 警告状态        #F59E0B     warning / amber-500     金       │
│ 错误/危险       #EF4444     destructive / red-500   火(过旺) │
│ 信息提示        #3B82F6     info / blue-500         水(流动) │
│                                       ↑ 水克火，形成水火既济 │
├─────────────────────────────────────────────────────────────┤
│ 用户消息气泡    #E8491A     primary (品牌主色)      火       │
│ Agent消息气泡   #F5F5F4     muted (浅灰)           土       │
│ 工具调用卡片    #FFFBEB     accent-50 (浅琥珀)      金       │
│ 工具卡片边框    #F59E0B     accent (琥珀金)         金       │
└─────────────────────────────────────────────────────────────┘
```

### 亮色模式语义色板速查

| Token | 色值 | 用途 |
|---|---|---|
| `--primary` | `#E8491A` | 主按钮、链接、品牌标识、用户消息气泡 |
| `--primary-foreground` | `#FFFFFF` | 主色上的文字 |
| `--accent` | `#F59E0B` | 高亮、工具卡片边框、特殊状态 |
| `--background` | `#FAFAF9` | 页面主背景 |
| `--card` | `#FFFFFF` | 卡片、面板、侧栏背景 |
| `--border` | `#E7E5E4` | 分割线、输入框边框 |
| `--muted` | `#F5F5F4` | Agent 消息背景、禁用态、次要区域 |
| `--foreground` | `#1C1917` | 主文字色 |
| `--muted-foreground` | `#78716C` | 辅助文字、时间戳、描述 |
| `--success` | `#10B981` | 成功、完成、✅ |
| `--destructive` | `#EF4444` | 删除、失败、❌ |
| `--info` | `#3B82F6` | 信息提示、链接（水火既济） |

---

### 暗色模式（Dark Mode）色彩方案

风水讲究阴阳平衡。暗色模式不是简单反转，而是**火的能量在暗夜中更加聚焦**——主色饱和度略降、明度提升，保持温暖感但不刺眼。

```
┌─────────────────────────────────────────────────────────────┐
│ 色彩角色         色值         Tailwind Token (dark)         │
├─────────────────────────────────────────────────────────────┤
│ 品牌主色        #F06030     primary (暗色下提亮)            │
│ 品牌主色(文字上)#1A0A04     primary-foreground              │
│ 品牌主色(浅背景)#2D1508     primary-900 (暗底色)            │
├─────────────────────────────────────────────────────────────┤
│ 强调色          #FBBF24     accent (暗色下更亮)             │
│ 强调色(浅)      #2D2006     accent-900                      │
├─────────────────────────────────────────────────────────────┤
│ 页面背景        #0F0D0B     background (暖黑底)             │
│ 卡片/侧栏背景   #1A1816     card                            │
│ 边框            #2D2A27     border                          │
│ 输入框背景      #24211E     muted                           │
├─────────────────────────────────────────────────────────────┤
│ 文字-主         #F5F0EB     foreground (暖白)               │
│ 文字-辅         #A89F97     muted-foreground                │
│ 文字-弱         #6B6560     —                              │
├─────────────────────────────────────────────────────────────┤
│ 成功状态        #34D399     success                         │
│ 警告状态        #FBBF24     warning                         │
│ 错误/危险       #F87171     destructive                     │
│ 信息提示        #60A5FA     info (水火既济，暗色下调亮)     │
├─────────────────────────────────────────────────────────────┤
│ 用户消息气泡    #F06030     primary (暗色品牌主色)          │
│ Agent消息气泡   #24211E     muted                           │
│ 工具调用卡片    #2D2006     accent-900                      │
│ 工具卡片边框    #FBBF24     accent                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Tailwind CSS 配置映射（v4）

Tailwind CSS v4 不再使用 `tailwind.config.ts`，配置通过 **CSS 文件** (`app/globals.css`) 中的 `@theme inline` 块完成。颜色以 `oklch()` 格式定义，暗色模式通过 `.dark` 选择器覆盖。

> **注意**：项目中没有 `tailwind.config.ts` 文件，这是 Tailwind v4 的正常行为。

色板定义在 `app/globals.css`：

```css
@import "tailwindcss";
@import "tw-animate-css";        /* shadcn/ui 动画依赖 */
@import "shadcn/tailwind.css";   /* shadcn/ui Tailwind 预设 */

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-primary: var(--primary);
  --color-background: var(--background);
  --color-accent: var(--accent);
  /* ... 所有语义色在此映射到 CSS 变量 */
}
```

实际色值在 `:root` 和 `.dark` 块中定义为 `oklch()` 格式：

| 色彩角色 | 亮色 oklch | 暗色 oklch | 五行 |
|---|---|---|---|
| `--primary` | `oklch(0.589 0.217 27.8)` | `oklch(0.649 0.198 27.8)` | 火 |
| `--background` | `oklch(0.982 0.003 84.3)` | `oklch(0.104 0.006 51.7)` | 土 |
| `--accent` | `oklch(0.795 0.174 74.5)` | `oklch(0.853 0.163 78.5)` | 金 |
| `--destructive` | `oklch(0.577 0.245 27.3)` | `oklch(0.65 0.22 25)` | 火(过旺) |
| `--border` | `oklch(0.911 0.004 71.3)` | `oklch(0.223 0.006 51.7)` | 土 |
| `--ring` | `oklch(0.589 0.217 27.8)` | `oklch(0.649 0.198 27.8)` | 火 |

> **参考色值对照**（仅用于设计稿取色，代码中不出现 hex）：
> - 吉阳橙红 `#E8491A`（亮色 primary）/ `#F06030`（暗色 primary）
> - 琥珀金 `#F59E0B`（亮色 accent）/ `#FBBF24`（暗色 accent）
> - 暖白底 `#FAFAF9`（亮色 background）/ `#0F0D0B`（暗色 background）

### 五行配色决策速查

| 场景 | 用色 | 五行 | 原因 |
|---|---|---|---|
| 品牌标识、主按钮、用户气泡 | 吉阳橙红 `#E8491A` | **火** | 阳光能量，品牌核心 |
| 页面背景、侧栏底 | 暖白 `#FAFAF9` | **土** | 稳重承载，火生土 |
| 工具卡片、特殊高亮 | 琥珀金 `#F59E0B` | **金** | 精密品质，土生金 |
| 成功通过 | 翠绿 `#10B981` | **木** | 生长通过 |
| 信息提示、次要链接 | 蓝 `#3B82F6` | **水** | 水火既济，平衡火势 |
| 错误删除 | 红 `#EF4444` | **火（过旺）** | 警示，火势失控之象 |

---

## 设计参考

- 整体风格参照 DeepSeek / ChatGPT 网页版：简洁、干净、高信息密度
- 左侧约 260-300px 宽会话列表，右侧填充剩余宽度
- 消息区域居中最大宽度 800px
- 颜色方案：详见上方「色彩体系与主题规划」章节（基于风水五行推导）
- 字体：Inter（系统字体栈兜底）
- 图标：使用 **lucide-react** 组件（Tree-shakable，按需导入）：
  ```tsx
  import { Send, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
  // 直接作为组件使用
  <Send className="h-4 w-4" />
  ```
- UI 基础组件：使用 **shadcn/ui**（通过 `npx shadcn add 组件名` 按需添加）：
  - `Button` → 登录按钮、发送按钮、新建/删除会话按钮
  - `Input` → 登录输入框、消息输入框
  - `Card` → 会话列表卡片、工具调用卡片
  - `Avatar` → 用户/Avatar 头像
  - `ScrollArea` → 消息列表滚动区域
  - `Separator` → 左右区域分隔线
