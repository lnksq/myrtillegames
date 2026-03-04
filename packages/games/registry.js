/**
 * @myrtille/games — Game Registry
 *
 * This is the SINGLE place where games are registered.
 * When you add a new game:
 *   1. Import its client and server modules
 *   2. Add an entry to the `games` map below
 *
 * The hub and server both read from this registry, so a game appears
 * everywhere the moment it's registered here.
 */

import { JustTheOneClient } from './just-the-one/client.js';
import { JustTheOneServer } from './just-the-one/server.js';
import { BlindtestClient } from './blindtest/client.js';
import { BlindtestServer } from './blindtest/server.js';

/**
 * Map of gameId → { client: GameClient class, server: GameServer class }
 */
const games = {
    'just-the-one': {
        client: JustTheOneClient,
        server: JustTheOneServer,
    },
    'blindtest': {
        client: BlindtestClient,
        server: BlindtestServer,
    },
    // ── Add new games below this line ──────────────────────────
    // 'your-game': {
    //   client: YourGameClient,
    //   server: YourGameServer,
    // },
};

/**
 * Get all registered games (for the hub to display).
 * @returns {Array<{ id, displayName, description, minPlayers, maxPlayers, icon }>}
 */
export function getGameList() {
    return Object.entries(games).map(([id, { client }]) => ({
        id,
        displayName: client.displayName,
        description: client.description,
        minPlayers: client.minPlayers,
        maxPlayers: client.maxPlayers,
        icon: client.icon,
    }));
}

/**
 * Get a specific game's client class.
 * @param {string} gameId
 * @returns {typeof import('@myrtille/engine').GameClient}
 */
export function getGameClient(gameId) {
    const entry = games[gameId];
    if (!entry) throw new Error(`Game "${gameId}" not found in registry.`);
    return entry.client;
}

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
