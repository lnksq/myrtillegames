/**
 * Myrtille Games — Server Entry Point
 *
 * Express + Socket.IO server that:
 *  1. Manages rooms and players
 *  2. Routes game actions to the correct game handler
 *  3. Broadcasts state updates to all players in a room
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { EVENTS, generateRoomCode } from '@myrtille/shared';
import { getGameServer } from '@myrtille/games/registry.js';

// ─── Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── In-Memory State ─────────────────────────────────────────
const rooms = new Map(); // roomCode → { gameId, players, host, gameState, gameHandler }

// ─── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        uptime: process.uptime(),
    });
});

// ─── Socket.IO ───────────────────────────────────────────────
io.on(EVENTS.CONNECT, (socket) => {
    console.log(`✅ Player connected: ${socket.id}`);

    // ── Create Room ──────────────────────────────────────────
    socket.on(EVENTS.ROOM_CREATE, ({ gameId, playerName }) => {
        const code = generateRoomCode();
        const room = {
            gameId,
            code,
            host: socket.id,
            players: [{ id: socket.id, name: playerName, ready: false }],
            gameState: null,
            gameHandler: null,
        };
        rooms.set(code, room);
        socket.join(code);
        socket.emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });
        console.log(`🏠 Room ${code} created for game "${gameId}" by ${playerName}`);
    });

    // ── Join Room ────────────────────────────────────────────
    socket.on(EVENTS.ROOM_JOIN, ({ code, playerName }) => {
        const room = rooms.get(code);
        if (!room) {
            socket.emit(EVENTS.ERROR, { message: `Room "${code}" not found.` });
            return;
        }

        room.players.push({ id: socket.id, name: playerName, ready: false });
        socket.join(code);
        io.to(code).emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });
        console.log(`👤 ${playerName} joined room ${code}`);
    });

    // ── Start Game ───────────────────────────────────────────
    socket.on(EVENTS.GAME_START, ({ code }) => {
        const room = rooms.get(code);
        if (!room || room.host !== socket.id) return;

        try {
            const ServerClass = getGameServer(room.gameId);
            room.gameHandler = new ServerClass();
            room.gameState = room.gameHandler.initialize(room);
            io.to(code).emit(EVENTS.GAME_STATE, room.gameState);
            console.log(`🎮 Game started in room ${code}`);
        } catch (err) {
            socket.emit(EVENTS.ERROR, { message: err.message });
        }
    });

    // ── Game Action ──────────────────────────────────────────
    socket.on(EVENTS.GAME_ACTION, ({ code, type, payload }) => {
        const room = rooms.get(code);
        if (!room || !room.gameHandler) return;

        const action = { type, payload, playerId: socket.id };
        room.gameState = room.gameHandler.handleAction(action, room.gameState);
        io.to(code).emit(EVENTS.GAME_STATE, room.gameState);

        // Check if game is over
        if (room.gameHandler.isGameOver(room.gameState)) {
            const results = room.gameHandler.getResults(room.gameState);
            io.to(code).emit(EVENTS.GAME_END, results);
            console.log(`🏁 Game over in room ${code}`);
        }
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on(EVENTS.DISCONNECT, () => {
        console.log(`❌ Player disconnected: ${socket.id}`);

        for (const [code, room] of rooms.entries()) {
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                room.players.splice(idx, 1);
                io.to(code).emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });

                // Cleanup empty rooms
                if (room.players.length === 0) {
                    rooms.delete(code);
                    console.log(`🗑️ Room ${code} deleted (empty)`);
                }
            }
        }
    });
});

// ─── Start ───────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`\n🫐 Myrtille Games Server running on http://localhost:${PORT}\n`);
});
