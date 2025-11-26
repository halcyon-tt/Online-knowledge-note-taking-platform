# homework2-EB

A modern Next.js project initialized with Copilot Agent featuring Zustand, shadcn/ui, TailwindCSS, husky, lint-staged, and GitHub Actions.

## 🚀 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS v4** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **shadcn/ui** - High-quality UI components
- **Husky** - Git hooks automation
- **lint-staged** - Run linters on staged files
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **GitHub Actions** - CI/CD pipeline

## 📦 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
```

## 🎯 Features

- ✅ **Type-safe** - Full TypeScript support
- ✅ **Modern UI** - TailwindCSS with custom design system
- ✅ **State Management** - Zustand for efficient state handling
- ✅ **Code Quality** - Automated linting and formatting
- ✅ **Git Hooks** - Pre-commit checks with husky
- ✅ **CI/CD** - Automated testing and building

## 🏗️ Project Structure

```
.
├── app/                  # Next.js app directory
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
├── store/                # Zustand stores
├── .github/
│   └── workflows/        # GitHub Actions workflows
├── .husky/               # Git hooks
└── public/               # Static assets
```

## 🔧 Configuration

### TailwindCSS

Configured with custom theme variables in `tailwind.config.ts` and `app/globals.css`.

### ESLint

Using Next.js recommended ESLint config with TypeScript support.

### Husky & lint-staged

Pre-commit hooks automatically lint and format staged files before committing.

## 📝 License

This project is for educational purposes.
