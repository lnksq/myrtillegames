import { useState, useEffect } from 'react';
import { EVENTS } from '@myrtille/shared';

/**
 * Blindtest — React Component
 *
 * Music quiz with buzzer: listen to audio snippets and be the first
 * to identify the song/artist.
 */
export function Blindtest({ socket }) {
    const [state, setState] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const onGameState = (newState) => {
            setState(newState);
        };

        socket.on(EVENTS.GAME_STATE, onGameState);
        return () => socket.off(EVENTS.GAME_STATE, onGameState);
    }, [socket]);

    const handleBuzz = () => {
        socket.emit('game:action', {
            type: 'BUZZ',
            payload: { timestamp: Date.now() },
        });
    };

    return (
        <div className="bt-game">
            <h2>🎵 Blindtest</h2>
            <button className="bt-buzzer" id="bt-buzzer" onClick={handleBuzz}>
                BUZZ!
            </button>
            <p className="bt-waiting">En attente du lancement...</p>
        </div>
    );
}
