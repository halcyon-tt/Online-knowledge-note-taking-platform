
# 在线知识笔记平台

一个现代化的在线笔记编辑平台，支持 Markdown、实时协作、AI 辅助搜索等功能。

## 🌟 功能特性

- ✅ **Markdown 编辑**：支持 Markdown 语法，所见即所得的编辑体验。
- ✅ **标签管理**：灵活的标签系统，方便笔记分类和检索。
- ✅ **文件夹管理**：支持创建文件夹，对笔记进行组织。
- ✅ **AI 辅助搜索**：集成 AI 搜索功能，快速定位笔记内容。
- ✅ **主题切换**：支持明暗主题切换。
- ✅ **用户认证**：支持邮箱和 GitHub 登录。
- ✅ **响应式设计**：完美适配桌面和移动设备。

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件**: Radix UI + Tailwind CSS
- **编辑器**: TipTap (基于 ProseMirror)
- **数据库**: Supabase
- **认证**: Supabase Auth
- **状态管理**: Zustand
- **AI 集成**: 豆包 AI API
- **测试**: Vitest + Testing Library
- **代码规范**: ESLint + Prettier + Husky

## 🚀 快速开始

### 前置条件

- Node.js 18.0 或更高版本
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/halcyon-tt/Online-knowledge-note-taking-platform.git
   cd Online-knowledge-note-taking-platform
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   创建 `.env.local` 文件并添加以下配置：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DOUBAO_API_KEY=your_doubao_api_key
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:3000` 查看应用。

## 📁 项目结构

```
Online-knowledge-note-taking-platform/
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/               # API 路由
│   ├── auth/              # 认证相关页面
│   ├── dashboard/         # 仪表板页面
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   └── ...               # 业务组件
├── contexts/             # React Context
├── lib/                  # 工具函数和配置
├── types/                # TypeScript 类型定义
├── mocks/                # API 模拟数据
└── ...                   # 其他配置文件
```

## 📖 使用指南
### 在线地址
https://online-knowledge-note-taking-platfo-tau.vercel.app/dashboard
### 可用账号
- 用户名：cbn@qq.com
- 密码：cbncbn

### 基本操作

1. **创建笔记**
   - 点击侧边栏的"+"按钮创建新笔记
   - 输入笔记标题和内容

2. **添加标签**
   - 点击笔记编辑器上方的标签按钮
   - 选择已有标签或创建新标签

3. **创建文件夹**
   - 在侧边栏右键点击空白处
   - 选择"新建文件夹"

4. **AI 搜索**
   - 点击搜索框
   - 输入自然语言查询
   - AI 将返回相关笔记

### 协同编辑

1. **分享笔记**
   - 在笔记编辑页面点击"分享"按钮
   - 复制分享链接发送给协作者

2. **实时协作**
   - 多人同时编辑同一笔记
   - 所有更改实时同步

## 🔧 开发指南

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint
npm run test         # 运行测试
npm run lint:fix     # 自动修复 ESLint 错误
```

### 代码规范

本项目使用以下工具确保代码质量：

- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Husky**: Git hooks
- **lint-staged**: 提交前检查

提交代码前会自动运行 lint 和 test。

## 🤝 贡献指南

我们欢迎任何形式的贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request


## 📬 联系方式

- **项目链接**: [https://github.com/halcyon-tt/Online-knowledge-note-taking-platform.git](https://github.com/halcyon-tt/Online-knowledge-note-taking-platform.git)
- **问题反馈**: [Issues](https://github.com/halcyon-tt/Online-knowledge-note-taking-platform.git/issues)
- **讨论区**: [Discussions](https://github.com/halcyon-tt/Online-knowledge-note-taking-platform.git/discussions)

---