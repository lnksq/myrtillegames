/**
 * @myrtille/games — Client Registry (browser only)
 *
 * This file is imported by the Vite hub frontend.
 * It imports game metadata and React components (no Node.js modules).
 */

import { JustTheOne } from './just-the-one/client.jsx';
import { Blindtest } from './blindtest/client.jsx';

const games = {
    'just-the-one': {
        id: 'just-the-one',
        displayName: 'Just the One',
        description: 'Donnez des indices uniques pour faire deviner un mot secret !',
        minPlayers: 3,
        maxPlayers: 10,
        icon: 'icon.svg',
        component: JustTheOne,
    },
    'whos-listening': {
        id: 'whos-listening',
        displayName: "Who's Listening?",
        description: 'Blindtest inversé : devinez qui écoute quoi !',
        minPlayers: 2,
        maxPlayers: 20,
        icon: 'icon.svg',
        external: true,
        url: 'https://client-one-gold.vercel.app/',
    },
    'blindtest': {
        id: 'blindtest',
        displayName: 'Blindtest',
        description: 'Quiz musical avec buzzer — soyez le plus rapide !',
        minPlayers: 2,
        maxPlayers: 20,
        icon: 'icon.svg',
        component: Blindtest,
    },
};

export function getGameList() {
    return Object.values(games).map(({ id, displayName, description, minPlayers, maxPlayers, icon, external, url }) => ({
        id,
        displayName,
        description,
        minPlayers,
        maxPlayers,
        icon,
        external,
        url,
    }));
}

export function getGameClient(gameId) {
    const entry = games[gameId];
    if (!entry) throw new Error(`Game "${gameId}" not found in client registry.`);
    return entry;
}
