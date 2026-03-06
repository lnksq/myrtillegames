/**
 * @myrtille/games — Game Registry (Server-side)
 *
 * This is the SINGLE place where games are registered on the server.
 * When you add a new game:
 *   1. Import its server module
 *   2. Add an entry to the `games` map below
 *
 * The server reads from this registry to handle game logic.
 */

import { JustTheOneServer } from './just-the-one/server.js';
import { BlindtestServer } from './blindtest/server.js';

/**
 * Map of gameId → { server: GameServer class }
 */
const games = {
    'just-the-one': {
        server: JustTheOneServer,
    },
    'blindtest': {
        server: BlindtestServer,
    },
    // ── Add new games below this line ──────────────────────────
    // 'your-game': {
    //   server: YourGameServer,
    // },
};

/**
 * Get a specific game's server class.
 * @param {string} gameId
 * @returns {typeof import('@myrtille/engine').GameServer}
 */
export function getGameServer(gameId) {
    const entry = games[gameId];
    if (!entry) throw new Error(`Game "${gameId}" not found in registry.`);
    return entry.server;
}

export default games;
