# Optima

A task scheduler that understands your energy. Schedule tasks when you're most productive.

## Features

- **Energy-aware scheduling** — Tasks are matched to your daily energy levels. High-energy tasks scheduled when you're energized, lighter tasks when you're running low.

- **Auto-scheduling** — One-click optimization of your day. The algorithm considers priority, motivation, and energy alignment to find the best slots.

- **Draft mode** — Preview schedule changes before committing. Drag tasks to adjust, lock important times, then apply or discard.

- **Calendar sync** — Import events from ICS files. Events block time slots and drain energy based on their intensity.

- **Day intentions** — Set your day to "push", "balance", or "recovery" mode. This adjusts your available capacity accordingly.

## Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Run tests
yarn test
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui components
- **Backend:** Supabase (PostgreSQL, Auth)
- **Testing:** Vitest, Testing Library

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # App-specific components
│   └── ui/            # shadcn/ui primitives
├── hooks/             # Custom React hooks
├── services/          # Business logic
├── data/              # Repository layer (Supabase)
├── utils/             # Pure utility functions
├── types/             # TypeScript interfaces
└── config/            # Centralized configuration
```

## Architecture

The codebase follows SOLID principles with clear separation of concerns:

- **Repository Pattern** — `src/data/` handles all database operations
- **Service Layer** — `src/services/` encapsulates business logic
- **Hook Composition** — `useTasks` composes focused hooks for data orchestration
- **Config-driven** — Energy levels, multipliers, and thresholds centralized in `src/config/`

See [AGENTS.md](./AGENTS.md) for complete coding guidelines.

## Environment Variables

Required for Supabase connection:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License

Private
