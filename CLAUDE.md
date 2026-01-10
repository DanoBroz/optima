# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React 19 application built with TypeScript and Vite. The project uses a minimal setup with Hot Module Replacement (HMR) and ESLint for code quality.

## Development Commands

### Running the Application
- `yarn dev` - Start development server with HMR
- `yarn preview` - Preview production build locally

### Build and Quality
- `yarn build` - Type check with TypeScript and build for production (output: `dist/`)
- `yarn lint` - Run ESLint on all TypeScript/TSX files

## Architecture

### Build Configuration
- **Build tool**: Vite with `@vitejs/plugin-react` (uses Babel for Fast Refresh)
- **TypeScript**: Strict mode enabled with split configs:
  - `tsconfig.app.json` - Application code (`src/`)
  - `tsconfig.node.json` - Build configuration files
  - Module resolution set to "bundler" with `noEmit: true`

### Application Structure
- `src/main.tsx` - Application entry point, renders `<App />` in StrictMode
- `src/App.tsx` - Root component
- `src/assets/` - Static assets (images, etc.)
- `index.html` - HTML entry point (Vite injects scripts)

### Code Quality
- ESLint configured with flat config format (`eslint.config.js`)
- Enforces React Hooks rules and React Refresh best practices
- TypeScript strict mode with unused variable detection enabled
