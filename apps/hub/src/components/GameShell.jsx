import { getGameClient } from '@games/registry.client.js';

export default function GameShell({ gameId, socket, onBack }) {
    const game = getGameClient(gameId);
    const GameComponent = game.component;

    return (
        <>
            <header className="game-header">
                <button className="back-btn" id="back-to-hub" onClick={onBack}>
                    ← Retour
                </button>
                <h2>{game.displayName}</h2>
            </header>
            <div id="game-shell">
                <GameComponent socket={socket} />
            </div>
        </>
    );
}
