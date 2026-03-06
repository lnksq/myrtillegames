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
    socket.on(EVENTS.ROOM_CREATE, ({ gameId, playerName, playerId }) => {
        const code = generateRoomCode();
        const pId = playerId || socket.id;
        socket.playerId = pId;

        const room = {
            gameId,
            code,
            host: pId,
            players: [{ id: pId, socketId: socket.id, name: playerName, ready: false }],
            gameState: null,
            gameHandler: null,
        };
        rooms.set(code, room);
        socket.join(code);
        socket.emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });
        console.log(`🏠 Room ${code} created for game "${gameId}" by ${playerName}`);
    });

    // ── Join Room ────────────────────────────────────────────
    socket.on(EVENTS.ROOM_JOIN, ({ code, playerName, playerId }) => {
        const room = rooms.get(code);
        if (!room) {
            socket.emit(EVENTS.ERROR, { message: `Room "${code}" not found.` });
            return;
        }

        const pId = playerId || socket.id;
        socket.playerId = pId;

        // Re-linking logic: check if this player was already in the room
        const existingPlayer = room.players.find(p => p.id === pId);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            console.log(`🔄 ${playerName} re-linked to room ${code} (playerId: ${pId})`);
        } else {
            room.players.push({ id: pId, socketId: socket.id, name: playerName, ready: false });
            console.log(`👤 ${playerName} joined room ${code} (playerId: ${pId})`);
        }

        socket.join(code);
        io.to(code).emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });

        // If game is already running, send the current state to the joining player
        if (room.gameState) {
            socket.emit(EVENTS.GAME_STATE, room.gameState);
        }
    });

    // ── Start Game ───────────────────────────────────────────
    socket.on(EVENTS.GAME_START, ({ code }) => {
        const room = rooms.get(code);
        if (!room || room.host !== (socket.playerId || socket.id)) return;

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
    socket.on(EVENTS.GAME_ACTION, async ({ code, type, payload }) => {
        const room = rooms.get(code);
        if (!room || !room.gameHandler) return;

        const action = { type, payload, playerId: socket.playerId || socket.id };
        let newState = room.gameHandler.handleAction(action, room.gameState);

        // Support async handleAction (returns a Promise)
        if (newState && typeof newState.then === 'function') {
            newState = await newState;
        }

        room.gameState = newState;
        io.to(code).emit(EVENTS.GAME_STATE, room.gameState);


        // Handle WhosListening async playlist loading:
        if (typeof room.gameHandler.checkPlaylistReady === 'function') {
            const pollInterval = setInterval(() => {
                const roomNow = rooms.get(code);
                if (!roomNow) {
                    clearInterval(pollInterval);
                    return;
                }
                const updatedState = room.gameHandler.checkPlaylistReady(roomNow.gameState);
                if (updatedState) {
                    roomNow.gameState = updatedState;
                    if (room.gameHandler.isGameOver(updatedState)) {
                        const results = room.gameHandler.getResults(updatedState);
                        io.to(code).emit(EVENTS.GAME_END, results);
                    } else {
                        io.to(code).emit(EVENTS.GAME_STATE, updatedState);
                    }
                }

                // Stop polling if game started
                if (roomNow.gameState.phase && roomNow.gameState.phase !== 'setup' && roomNow.gameState.phase !== 'loading') {
                    clearInterval(pollInterval);
                }
            }, 1000);
            // Safety: stop polling after 60s
            setTimeout(() => clearInterval(pollInterval), 60000);
        }

        // Check if game is over
        if (room.gameHandler.isGameOver(room.gameState)) {
            const results = room.gameHandler.getResults(room.gameState);
            io.to(code).emit(EVENTS.GAME_END, results);
            console.log(`🏁 Game over in room ${code}`);
        }
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on(EVENTS.DISCONNECT, () => {
        const socketId = socket.id;
        const pId = socket.playerId || socketId;
        console.log(`❌ Player disconnected: ${socketId} (playerId: ${pId})`);

        for (const [code, room] of rooms.entries()) {
            // Find if this socket was the active one for a player
            const player = room.players.find(p => p.socketId === socketId);

            if (player) {
                // We don't remove the player immediately if they have a stable ID,
                // so they can reconnect. We only remove if it's an ephemeral socket or if room is empty.
                // For now, let's just update room for UI if we want to show 'offline', 
                // but the current structure removes them. 
                // To fix the "word suppression", we MUST keep them in the players array.

                // room.players.splice(idx, 1); // <--- REMOVED

                console.log(`📡 Player ${player.name} (${pId}) is currently disconnected from room ${code}`);
                io.to(code).emit(EVENTS.ROOM_UPDATE, { code, players: room.players, host: room.host });
            }
        }
    });
});

// ─── Start ───────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`\n🫐 Myrtille Games Server running on http://localhost:${PORT}\n`);
});
