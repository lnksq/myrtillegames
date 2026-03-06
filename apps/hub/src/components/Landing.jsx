import { useState, useEffect } from 'react';
import { getGameList } from '@games/registry.client.js';

// ─── Placeholder "system" icons to fill the grid ─────────────
const SYSTEM_ICONS = [
    { id: 'camera', emoji: '📷', label: 'Camera' },
    { id: 'music', emoji: '🎵', label: 'Musique' },
    { id: 'friends', emoji: '👥', label: 'Amis' },
    { id: 'trophies', emoji: '🏆', label: 'Trophées' },
    { id: 'settings', emoji: '⚙️', label: 'Réglages' },
    { id: 'shop', emoji: '🛒', label: 'Boutique' },
];

const EMOJI_MAP = {
    'just-the-one': '🎯',
    'blindtest': '🎵',
};

export default function Landing({ onLaunchGame }) {
    const [time, setTime] = useState(() =>
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    );
    const games = getGameList();

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    const handleLaunch = (game) => {
        if (game.external && game.url) {
            window.location.href = game.url;
            return;
        }
        onLaunchGame(game.id);
    };

    return (
        <>
            {/* Main Content */}
            <main className="hub-content">
                <div className="hub-brand">
                    <div className="hub-brand__icon">🫐</div>
                    <div className="hub-brand__title">MYRTILLE GAMES</div>
                    <div className="hub-brand__sub">Choisis un jeu · Lance une partie</div>
                </div>

                <div className="icon-grid-wrapper">
                    <div className="icon-grid">
                        {games.map(game => (
                            <button
                                key={game.id}
                                className="game-icon"
                                id={`game-card-${game.id}`}
                                title={game.displayName}
                                onClick={() => handleLaunch(game)}
                            >
                                <span className="game-icon__emoji">{EMOJI_MAP[game.id] || '🎮'}</span>
                                <span className="game-icon__label">{game.displayName}</span>
                            </button>
                        ))}
                        {SYSTEM_ICONS.map(icon => (
                            <button
                                key={icon.id}
                                className="game-icon"
                                data-system="true"
                                id={`sys-${icon.id}`}
                                title={icon.label}
                            >
                                <span className="game-icon__emoji">{icon.emoji}</span>
                                <span className="game-icon__label">{icon.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Status Bar */}
            <footer className="status-bar">
                <div className="status-bar__left">
                    <span className="status-bar__dot"></span>
                    <span>En ligne</span>
                </div>
                <span>{time} · v1.0.0</span>
            </footer>
        </>
    );
}
