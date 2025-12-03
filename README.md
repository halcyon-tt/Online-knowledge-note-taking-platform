# 在线笔记编辑平台

一个基于 Next.js 的现代化笔记编辑平台，支持 Markdown 编辑、实时预览和协同编辑功能。

## 🚀 Tech Stack

- **Next.js 16** - React 框架，支持 SSR/SSG
- **TypeScript** - 类型安全的开发
- **Tiptap** - 基于 ProseMirror 的富文本编辑器
- **Yjs** - 协同编辑核心，CRDT 数据结构
- **Hocuspocus** - Yjs 的服务端与客户端 Provider
- **Socket.io** - 协同通信通道
- **TailwindCSS v4** - 原子化 CSS，集成动画、表单样式等
- **Zustand** - 轻量级状态管理
- **shadcn/ui** - 高质量 UI 组件
- **React Markdown** - Markdown 实时预览

## 📦 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Install dependencies
npm install

# 启动开发服务器（需要同时运行 Next.js 和 Hocuspocus 服务器）
npm run dev:all

# 或者分别启动
npm run dev          # 启动 Next.js 开发服务器
npm run dev:server   # 启动 Hocuspocus 协同编辑服务器
```

打开 [http://localhost:3000](http://localhost:3000) 在浏览器中查看应用。

**注意**：协同编辑功能需要 Hocuspocus 服务器运行在 `ws://localhost:1234`。

### Available Scripts

```bash
# Development
npm run dev          # 启动 Next.js 开发服务器
npm run dev:server   # 启动 Hocuspocus 协同编辑服务器
npm run dev:all      # 同时启动 Next.js 和 Hocuspocus 服务器

# Production
npm run build        # 构建生产版本
npm run start        # 启动生产服务器

# Code Quality
npm run lint         # 运行 ESLint
npm run lint:fix     # 修复 ESLint 错误
```

## 🎯 Features

- ✅ **笔记管理** - 创建、编辑、删除、查看笔记
- ✅ **Markdown 编辑** - 使用 Tiptap 富文本编辑器，支持 Markdown 语法
- ✅ **实时预览** - 编辑时实时预览 Markdown 渲染效果
- ✅ **协同编辑** - 基于 Yjs 和 Hocuspocus 的实时协同编辑功能
- ✅ **简约风格** - 现代化的深色主题 UI 设计
- ✅ **类型安全** - 完整的 TypeScript 支持
- ✅ **状态管理** - 使用 Zustand 进行高效的状态管理

## 🏗️ Project Structure

```
.
├── app/                      # Next.js app directory
│   ├── globals.css           # 全局样式
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 笔记列表页面（主页面）
│   └── notes/
│       └── [id]/
│           └── page.tsx      # 笔记编辑页面（子页面）
├── components/               # React 组件
│   └── ui/                   # shadcn/ui 组件
├── lib/                      # 工具函数和类型定义
│   ├── notesClient.ts        # 笔记客户端（本地存储）
│   └── types.ts              # TypeScript 类型定义
├── server/                   # 服务器端代码
│   └── hocuspocus.ts         # Hocuspocus 协同编辑服务器
├── store/                    # Zustand 状态管理
│   └── useStore.ts           # 笔记状态管理
├── scripts/                  # 脚本文件
│   └── start-server.ts       # 启动服务器脚本
└── public/                   # 静态资源
```

## 📖 使用说明

### 笔记列表页面（主页面）

- 显示所有笔记的卡片列表
- 点击"新建笔记"创建新笔记
- 点击笔记卡片进入编辑页面
- 悬停笔记卡片可看到删除按钮

### 笔记编辑页面（子页面）

- **编辑区**：使用 Tiptap 富文本编辑器，支持 Markdown 语法
- **预览区**：实时预览 Markdown 渲染效果
- **标题编辑**：在顶部输入框编辑笔记标题
- **自动保存**：编辑内容后 2 秒自动保存
- **手动保存**：点击"保存"按钮立即保存
- **删除笔记**：点击"删除"按钮删除当前笔记
- **协同编辑**：右上角显示连接状态，支持多人实时协同编辑

### 协同编辑功能

1. 启动 Hocuspocus 服务器：`npm run dev:server`
2. 在多个浏览器标签页或设备中打开同一篇笔记
3. 实时看到其他用户的编辑内容
4. 所有更改通过 WebSocket 实时同步

## 🔧 Configuration

### TailwindCSS

配置了自定义主题变量和 Typography 插件，支持 prose 样式。

### Hocuspocus 服务器

默认运行在 `ws://localhost:1234`，可在 `server/hocuspocus.ts` 中配置。

### 数据存储

当前使用浏览器 localStorage 存储笔记数据，可替换为后端 API。

## 📝 License

本项目用于教育目的。
