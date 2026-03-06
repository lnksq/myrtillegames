import { useState, useEffect } from 'react';
import { getGameList } from '@games/registry.client.js';

// ─── SVG Icons for Utility Bar ───────────────────────────────
const UTILITY_ICONS = [
    {
        id: 'brightness',
        label: 'Luminosité',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    },
    {
        id: 'grid',
        label: 'Grille',
        svg: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
    {
        id: 'pencil',
        label: 'Éditer',
        svg: `<svg viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    },
    {
        id: 'mii',
        label: 'Profil',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,
    },
    {
        id: 'chat',
        label: 'Chat',
        svg: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
        id: 'globe',
        label: 'Internet',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>`,
    },
];

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
            {/* Utility Bar */}
            <nav className="utility-bar" aria-label="Barre d'outils">
                {UTILITY_ICONS.map((icon, i) => (
                    <span key={icon.id}>
                        {i > 0 && <span className="utility-sep"></span>}
                        <button
                            className="utility-btn"
                            id={`util-${icon.id}`}
                            title={icon.label}
                            aria-label={icon.label}
                            dangerouslySetInnerHTML={{ __html: icon.svg }}
                        />
                    </span>
                ))}
            </nav>

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
