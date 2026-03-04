# 🫐 Myrtille Games

A multiplayer game hub built as a monorepo.

## Project Structure

```
myrtillegames/
├── apps/
│   ├── hub/          # Frontend — Landing page & game shell
│   └── server/       # Backend  — Socket.IO server
├── packages/
│   ├── shared/       # Shared types, constants, design tokens
│   ├── engine/       # Game engine contracts (interfaces)
│   └── games/        # Individual games
│       ├── just-the-one/
│       └── blindtest/
└── package.json      # Workspace root
```

## Getting Started

```bash
# Install all dependencies
npm install

# Run the frontend hub
npm run dev

# Run the backend server
npm run dev:server

# Run both simultaneously
npm run dev:all
```

## Adding a New Game

1. Create a folder under `packages/games/your-game-name/`
2. Copy the structure from an existing game (e.g., `just-the-one`)
3. Register your game in `packages/games/registry.js`
4. Done! The hub will automatically pick it up.

See [packages/engine/README.md](./packages/engine/README.md) for the full game contract documentation.
