# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

**Optima** is a React 19 task scheduler app with energy-aware scheduling. Built with TypeScript, Vite, Tailwind CSS, and shadcn/ui components. Uses IndexedDB (Dexie) for local persistence.

## Build/Lint/Test Commands

```bash
# Development
yarn dev              # Start dev server with HMR (port 5173)
yarn preview          # Preview production build locally

# Build & Quality
yarn build            # TypeScript check + Vite production build
yarn lint             # Run ESLint on all TS/TSX files

# Testing (Vitest)
yarn test             # Run all tests once
yarn test -- --watch  # Watch mode
yarn test -- src/utils/time.test.ts              # Run single test file
yarn test -- -t "formats durations"              # Run tests matching pattern
yarn test -- --coverage                          # Generate coverage report
```

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # App-specific components (TaskCard, TimelineView, etc.)
│   └── ui/            # shadcn/ui primitives (Button, Card, Dialog, etc.)
├── data/              # Repository layer (CRUD operations)
│   ├── taskRepository.ts
│   ├── eventRepository.ts
│   └── energyRepository.ts
├── services/          # Business logic services
│   ├── capacityService.ts
│   └── scheduleService.ts
├── hooks/             # React hooks (useTasks, use-mobile, etc.)
├── pages/             # Route components (Index, NotFound)
├── types/             # TypeScript interfaces (task.ts)
├── utils/             # Pure utility functions (time, energy, autoSchedule)
├── db/                # Dexie database setup
├── lib/               # Shared utilities (cn for classnames)
└── test/              # Test setup files
```

## Code Style Guidelines

- **Strict mode enabled** - no implicit any, unused vars are errors
- Use `type` imports for type-only imports: `import type { Task } from '@/types/task'`
- Prefer interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` or proper typing

```typescript
// Good
interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  compact?: boolean;
}

// Bad
const handleClick = (e: any) => { ... }
```

### React Components

```typescript
interface Props {
  title: string;
  onClose: () => void;
}

export function MyComponent({ title, onClose }: Props) {
  return <div>{title}</div>;
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase, `use` prefix | `useTasks.ts` |
| Utils | camelCase | `formatDuration` |
| Types | PascalCase | `DailyEnergyLevel` |
| Constants | SCREAMING_SNAKE | `WORK_HOURS_START` |
| Files | kebab-case or PascalCase | `use-mobile.tsx`, `TaskCard.tsx` |

### Styling

- Use Tailwind CSS classes via `cn()` utility for conditional classes
- Use CSS variables defined in `index.css` for theming
- Component variants use `rounded-2xl`, `rounded-3xl` for playful feel
- Color palette: warm peach/brown zen tones

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "bg-card rounded-2xl p-4",
  isActive && "ring-2 ring-primary",
  disabled && "opacity-50"
)} />
```

### Error Handling

- Use try/catch for async operations in hooks/services
- Return early for invalid states
- Prefer optional chaining and nullish coalescing

```typescript
// Good
const value = data?.items?.[0] ?? defaultValue;

// In async functions
try {
  await taskRepository.add(task);
} catch (error) {
  console.error('Failed to add task:', error);
}
```

### Testing

```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    render(<Component />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## Architecture Principles

1. **SOLID/KISS** - Keep functions focused, split large files
2. **Repository pattern** - `src/data/` handles all DB operations
3. **Service layer** - `src/services/` for business logic
4. **Pure utils** - `src/utils/` contains testable pure functions
5. **Hooks orchestrate** - `useTasks` combines repositories + services

## Key Files Reference

| Purpose | File |
|---------|------|
| Main hook | `src/hooks/useTasks.ts` |
| Database | `src/db/database.ts` |
| Types | `src/types/task.ts` |
| CSS vars | `src/index.css` |
| Tailwind config | `tailwind.config.ts` |
| Vite config | `vite.config.ts` |
| Test setup | `src/test/setup.ts` |

## Do NOT

- Use `eslint-disable` comments - fix issues properly
- Create unnecessary documentation files
- Use `require()` - use ES6 imports
- Export non-components from component files (causes React Refresh warnings)
- Use `any` type - find proper typing