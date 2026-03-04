/**
 * @myrtille/games — Client Registry (browser only)
 *
 * This file is imported by the Vite hub frontend.
 * It ONLY imports GameClient classes (no Node.js modules).
 */

import { JustTheOneClient } from './just-the-one/client.js';
import { BlindtestClient } from './blindtest/client.js';

const games = {
    'just-the-one': { client: JustTheOneClient },
    'blindtest': { client: BlindtestClient },
};

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

export function getGameClient(gameId) {
    const entry = games[gameId];
    if (!entry) throw new Error(`Game "${gameId}" not found in client registry.`);
    return entry.client;
}
