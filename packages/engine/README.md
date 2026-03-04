# @myrtille/engine

This package defines the **game contract** — the interfaces that every game must follow to plug into the Myrtille Games platform.

## Quick Start

```js
import { GameClient, GameServer } from '@myrtille/engine';

// Client-side
class MyGameClient extends GameClient {
  static id = 'my-game';
  static displayName = 'My Awesome Game';
  static description = 'A super fun game!';
  static minPlayers = 2;
  static maxPlayers = 6;

  mount(container, context) {
    container.innerHTML = '<h1>My Game!</h1>';
  }

  onStateUpdate(state) {
    // re-render based on new state
  }
}

// Server-side
class MyGameServer extends GameServer {
  static id = 'my-game';

  initialize(room) {
    return { round: 1, scores: {} };
  }

  handleAction(action, state) {
    // process action → return new state
    return state;
  }
}
```

## Contract

### GameClient

| Method / Property | Required | Description |
|---|---|---|
| `static id` | ✅ | Unique game identifier |
| `static displayName` | ✅ | Shown in the hub |
| `static description` | ✅ | Short description |
| `static minPlayers` | ✅ | Minimum player count |
| `static maxPlayers` | ✅ | Maximum player count |
| `static icon` | ❌ | Path to thumbnail |
| `mount(container, ctx)` | ✅ | Render initial UI |
| `onStateUpdate(state)` | ✅ | Handle server updates |
| `destroy()` | ❌ | Cleanup on unmount |

### GameServer

| Method | Required | Description |
|---|---|---|
| `static id` | ✅ | Unique game identifier |
| `initialize(room)` | ✅ | Return initial game state |
| `handleAction(action, state)` | ✅ | Process player actions |
| `isGameOver(state)` | ❌ | Check end condition |
| `getResults(state)` | ❌ | Compute final scores |
