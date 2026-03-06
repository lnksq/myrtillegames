import { useMemo, useEffect } from 'react';
import { io } from 'socket.io-client';
import { EVENTS } from '@myrtille/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let _socket = null;

function getOrCreateSocket() {
    if (!_socket) {
        _socket = io(SERVER_URL, {
            autoConnect: true,
            transports: ['websocket'],
        });

        _socket.on(EVENTS.CONNECT, () => {
            console.log(`🫐 Connected to server: ${_socket.id}`);
        });

        _socket.on(EVENTS.DISCONNECT, () => {
            console.log('⚡ Disconnected from server');
        });

        _socket.on(EVENTS.ERROR, ({ message }) => {
            console.error('Server error:', message);
        });
    }
    return _socket;
}

/**
 * React hook that provides the singleton Socket.IO instance.
 * The socket is created once and reused across the app.
 */
export function useSocket() {
    const socket = useMemo(() => getOrCreateSocket(), []);
    return socket;
}
