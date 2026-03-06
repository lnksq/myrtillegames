import { useState, useCallback } from 'react';
import { useSocket } from './hooks/useSocket.js';
import Landing from './components/Landing.jsx';
import GameShell from './components/GameShell.jsx';

export default function App() {
    const socket = useSocket();
    const [currentGameId, setCurrentGameId] = useState(null);

    const handleLaunchGame = useCallback((gameId) => {
        setCurrentGameId(gameId);
    }, []);

    const handleBackToHub = useCallback(() => {
        setCurrentGameId(null);
    }, []);

    if (currentGameId) {
        return (
            <GameShell
                gameId={currentGameId}
                socket={socket}
                onBack={handleBackToHub}
            />
        );
    }

    return <Landing onLaunchGame={handleLaunchGame} />;
}
