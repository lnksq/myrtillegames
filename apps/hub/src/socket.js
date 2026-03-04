/**
 * @myrtille/hub — Socket Manager
 *
 * Singleton wrapper around Socket.IO client.
 * Used by the hub's launchGame() to inject a live socket
 * into the game's context object.
 */
import { io } from 'socket.io-client';
import { EVENTS } from '@myrtille/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let _socket = null;

export function getSocket() {
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

export function disconnectSocket() {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }
}
