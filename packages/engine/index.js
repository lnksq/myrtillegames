/**
 * @myrtille/engine
 *
 * This package defines the "contract" that every game must follow.
 * By implementing these base classes, a game automatically plugs into
 * the hub and the server without any modification to either.
 *
 * ┌──────────────────────────────────────────────────┐
 * │  HOW TO ADD A NEW GAME                           │
 * │                                                  │
 * │  1. Create packages/games/your-game/             │
 * │  2. Export a `client` object (extends GameClient) │
 * │  3. Export a `server` object (extends GameServer) │
 * │  4. Register it in packages/games/registry.js    │
 * └──────────────────────────────────────────────────┘
 */

// ─── Game Client Contract ────────────────────────────────────
/**
 * Base class for the client-side (UI) of a game.
 * Each game must extend this and implement all methods.
 */
export class GameClient {
    /**
     * Unique identifier matching the registry key.
     * @type {string}
     */
    static id = '';

    /**
     * Human-readable display name.
     * @type {string}
     */
    static displayName = '';

    /**
     * Short description shown in the hub.
     * @type {string}
     */
    static description = '';

    /**
     * Min/max player counts.
     */
    static minPlayers = 2;
    static maxPlayers = 8;

    /**
     * Path to the game's icon/thumbnail (relative to the game folder).
     * @type {string}
     */
    static icon = '';

    /**
     * Called once when the game is mounted into the hub's game shell.
     * Use this to render your initial UI.
     * @param {HTMLElement} container — the DOM element to mount into
     * @param {object} context — { socket, roomCode, players, isHost }
     */
    mount(container, context) {
        throw new Error(`${this.constructor.name}.mount() not implemented`);
    }

    /**
     * Called when the server sends a game state update.
     * @param {object} state
     */
    onStateUpdate(state) {
        throw new Error(`${this.constructor.name}.onStateUpdate() not implemented`);
    }

    /**
     * Called when the game is unmounted (navigating away, game over).
     * Clean up event listeners, timers, etc.
     */
    destroy() {
        // Default: no-op. Override if needed.
    }
}

// ─── Game Server Contract ────────────────────────────────────
/**
 * Base class for the server-side logic of a game.
 * Each game must extend this and implement all methods.
 */
export class GameServer {
    /**
     * Unique identifier matching the registry key.
     * @type {string}
     */
    static id = '';

    /**
     * Called when the game starts. Initialize your state here.
     * @param {object} room — { code, players, host, ... }
     * @returns {object} initialState — sent to all clients
     */
    initialize(room) {
        throw new Error(`${this.constructor.name}.initialize() not implemented`);
    }

    /**
     * Called when a player sends a game action.
     * @param {object} action — { type, payload, playerId }
     * @param {object} currentState
     * @returns {object} newState — broadcast to all clients
     */
    handleAction(action, currentState) {
        throw new Error(`${this.constructor.name}.handleAction() not implemented`);
    }

    /**
     * Check if the game is over.
     * @param {object} state
     * @returns {boolean}
     */
    isGameOver(state) {
        return false;
    }

    /**
     * Compute final results/scores.
     * @param {object} state
     * @returns {object} results
     */
    getResults(state) {
        return {};
    }
}
