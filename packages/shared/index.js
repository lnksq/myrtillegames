/**
 * @myrtille/shared
 * Shared constants, types, and utilities for Myrtille Games.
 */

// ─── Game States ─────────────────────────────────────────────
export const GAME_STATES = {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
};

// ─── Socket Events (Global) ─────────────────────────────────
export const EVENTS = {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',

    // Room management
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    ROOM_UPDATE: 'room:update',

    // Player
    PLAYER_READY: 'player:ready',
    PLAYER_UPDATE: 'player:update',

    // Game lifecycle
    GAME_START: 'game:start',
    GAME_ACTION: 'game:action',
    GAME_STATE: 'game:state',
    GAME_END: 'game:end',

    // Chat / misc
    CHAT_MESSAGE: 'chat:message',
    ERROR: 'error',
};

// ─── Design Tokens ───────────────────────────────────────────
export const COLORS = {
    blueberry: {
        50: '#f0f0ff',
        100: '#dcdcfa',
        200: '#b8b8f5',
        300: '#8e8eef',
        400: '#6a6ae8',
        500: '#4a4adf',   // primary
        600: '#3636c4',
        700: '#2828a3',
        800: '#1e1e82',
        900: '#161665',
    },
    neutral: {
        0: '#ffffff',
        50: '#f8f9fa',
        100: '#f1f3f5',
        200: '#e9ecef',
        300: '#dee2e6',
        400: '#ced4da',
        500: '#adb5bd',
        600: '#868e96',
        700: '#495057',
        800: '#343a40',
        900: '#212529',
    },
};

// ─── Helpers ─────────────────────────────────────────────────
/**
 * Generate a random room code (e.g., "ABCD").
 * @param {number} length
 * @returns {string}
 */
export function generateRoomCode(length = 4) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
