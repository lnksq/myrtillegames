/**
 * Myrtille Games Hub — Main Entry Point
 *
 * Renders a Nintendo 3DS-inspired bottom screen:
 *   ┌─────────────────────────────────┐
 *   │  ☀  ⊞  ✎  😊  💬  🌐         │  ← Utility Bar
 *   ├─────────────────────────────────┤
 *   │                                 │
 *   │  🎯  🎵  👥  📷  🃏  ...      │  ← Icon Grid (2 rows)
 *   │  🎮  🏆  ⚡  🎲  🧩  ...      │
 *   │                                 │
 *   ├─────────────────────────────────┤
 *   │  ● Online              v1.0.0  │  ← Status Bar
 *   └─────────────────────────────────┘
 */

import { getGameList, getGameClient } from '@games/registry.client.js';
import { getSocket } from './socket.js';

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

// ─── State ───────────────────────────────────────────────────
let currentGame = null;
const app = document.getElementById('app');

// ─── Render Utility Bar ──────────────────────────────────────
function renderUtilityBar() {
  return `
    <nav class="utility-bar" aria-label="Barre d'outils">
      ${UTILITY_ICONS.map((icon, i) => `
        ${i > 0 ? '<span class="utility-sep"></span>' : ''}
        <button class="utility-btn" id="util-${icon.id}" title="${icon.label}" aria-label="${icon.label}">
          ${icon.svg}
        </button>
      `).join('')}
    </nav>
  `;
}

// ─── Render Icon Grid ────────────────────────────────────────
function renderIconGrid() {
  const games = getGameList();

  // Map games to icon cards
  const gameIcons = games.map(game => {
    const emojiMap = {
      'just-the-one': '🎯',
      'blindtest': '🎵',
    };
    return `
      <button class="game-icon" data-game-id="${game.id}" id="game-card-${game.id}" title="${game.displayName}">
        <span class="game-icon__emoji">${emojiMap[game.id] || '🎮'}</span>
        <span class="game-icon__label">${game.displayName}</span>
      </button>
    `;
  });

  // System placeholder icons
  const sysIcons = SYSTEM_ICONS.map(icon => `
    <button class="game-icon" data-system="true" id="sys-${icon.id}" title="${icon.label}">
      <span class="game-icon__emoji">${icon.emoji}</span>
      <span class="game-icon__label">${icon.label}</span>
    </button>
  `);

  return `
    <div class="icon-grid-wrapper">
      <div class="icon-grid">
        ${gameIcons.join('')}
        ${sysIcons.join('')}
      </div>
    </div>
  `;
}

// ─── Render Status Bar ───────────────────────────────────────
function renderStatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `
    <footer class="status-bar">
      <div class="status-bar__left">
        <span class="status-bar__dot"></span>
        <span>En ligne</span>
      </div>
      <span>${time} · v1.0.0</span>
    </footer>
  `;
}

// ─── Render Landing Page ─────────────────────────────────────
function renderLanding() {
  app.innerHTML = `
    ${renderUtilityBar()}

    <main class="hub-content">
      <div class="hub-brand">
        <div class="hub-brand__icon">🫐</div>
        <div class="hub-brand__title">MYRTILLE GAMES</div>
        <div class="hub-brand__sub">Choisis un jeu · Lance une partie</div>
      </div>

      ${renderIconGrid()}
    </main>

    ${renderStatusBar()}
  `;

  // ── Attach game launch handlers ────────────────────────
  app.querySelectorAll('.game-icon[data-game-id]').forEach(card => {
    card.addEventListener('click', () => {
      launchGame(card.dataset.gameId);
    });
  });

  // ── Update time every minute ───────────────────────────
  setInterval(() => {
    const statusBar = app.querySelector('.status-bar');
    if (statusBar) {
      const now = new Date();
      const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      statusBar.querySelector('span:last-child').textContent = `${time} · v1.0.0`;
    }
  }, 60_000);
}

// ─── Launch Game ─────────────────────────────────────────────
function launchGame(gameId) {
  const ClientClass = getGameClient(gameId);
  currentGame = new ClientClass();
  const socket = getSocket();

  app.innerHTML = `
    <header class="game-header">
      <button class="back-btn" id="back-to-hub">← Retour</button>
      <h2>${ClientClass.displayName}</h2>
    </header>
    <div id="game-shell"></div>
  `;

  const shell = document.getElementById('game-shell');
  currentGame.mount(shell, {
    socket,
    roomCode: null,
    players: [],
    isHost: false,
  });

  document.getElementById('back-to-hub').addEventListener('click', () => {
    if (currentGame) currentGame.destroy();
    currentGame = null;
    renderLanding();
  });
}

// ─── Boot ────────────────────────────────────────────────────
renderLanding();
