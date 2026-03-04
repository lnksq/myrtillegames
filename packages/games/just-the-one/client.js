import { GameClient } from '@myrtille/engine';
import { EVENTS } from '@myrtille/shared';

/**
 * Just the One — Client
 *
 * Renders different views based on the game phase and the player's role:
 *   - Title Screen (name entry + host/join)
 *   - Lobby (waiting for players)
 *   - number_selection, clue_giving, guessing, scoring, game_over
 */
export class JustTheOneClient extends GameClient {
    static id = 'just-the-one';
    static displayName = 'Just the One';
    static description = 'Donnez des indices uniques pour faire deviner un mot secret !';
    static minPlayers = 3;
    static maxPlayers = 10;
    static icon = 'icon.svg';

    mount(container, context) {
        this.container = container;
        this.socket = context.socket;
        this.roomCode = context.roomCode;
        this.players = context.players;
        this.isHost = context.isHost;

        // Local player identity (set on the title screen)
        this.playerName = '';
        this.playerId = this.socket?.id || null;
        this.currentRoom = null;
        this.gameState = null;

        this._setupSocketListeners();
        this._renderTitleScreen();
    }

    // ─── Socket Listeners ─────────────────────────────────────

    _setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on(EVENTS.ROOM_UPDATE, (room) => {
            this.currentRoom = room;
            if (this.gameState === null) {
                this._renderLobby(room);
            }
        });

        this.socket.on(EVENTS.GAME_STATE, (state) => {
            this.gameState = state;
            this.onStateUpdate(state);
        });

        this.socket.on(EVENTS.GAME_END, (results) => {
            this._renderGameOver(results);
        });

        this.socket.on(EVENTS.ERROR, ({ message }) => {
            this._showError(message);
        });

        // Track own socket ID
        if (this.socket.connected) {
            this.playerId = this.socket.id;
        }
        this.socket.on(EVENTS.CONNECT, () => {
            this.playerId = this.socket.id;
        });
    }

    // ─── Routing: State → View ────────────────────────────────

    onStateUpdate(state) {
        this.gameState = state;
        const guesser = state.players[state.guesserIndex];
        const iAmGuesser = guesser?.id === this.playerId;

        switch (state.phase) {
            case 'number_selection': return this._renderNumberSelection(state, iAmGuesser, guesser);
            case 'clue_giving': return this._renderClueGiving(state, iAmGuesser, guesser);
            case 'guessing': return this._renderGuessing(state, iAmGuesser, guesser);
            case 'scoring': return this._renderScoring(state);
            case 'game_over': return this._renderGameOver(state);
        }
    }

    // ─── Views ────────────────────────────────────────────────

    /** Title screen: enter name, host or join */
    _renderTitleScreen() {
        this.container.innerHTML = `
            <div class="jto jto-title">
                <div class="jto-logo">🎯</div>
                <h1 class="jto-title__name">Just the One</h1>
                <p class="jto-title__sub">Indice unique · Coopératif · 3–10 joueurs</p>

                <div class="jto-form">
                    <input
                        class="jto-input"
                        id="jto-name-input"
                        type="text"
                        placeholder="Ton pseudo..."
                        maxlength="20"
                        autocomplete="off"
                    />
                    <div class="jto-title__actions">
                        <button class="jto-btn jto-btn--primary" id="jto-create-btn">
                            ✦ Créer une partie
                        </button>
                        <div class="jto-divider">ou</div>
                        <div class="jto-join-row">
                            <input
                                class="jto-input jto-input--code"
                                id="jto-code-input"
                                type="text"
                                placeholder="CODE"
                                maxlength="4"
                                autocomplete="off"
                            />
                            <button class="jto-btn jto-btn--secondary" id="jto-join-btn">
                                Rejoindre
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const nameInput = document.getElementById('jto-name-input');
        const codeInput = document.getElementById('jto-code-input');
        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.toUpperCase();
        });

        document.getElementById('jto-create-btn').addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.focus(); return; }
            this.playerName = name;
            this.isHost = true;
            this.socket.emit(EVENTS.ROOM_CREATE, { gameId: 'just-the-one', playerName: name });
        });

        document.getElementById('jto-join-btn').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const code = codeInput.value.trim().toUpperCase();
            if (!name) { nameInput.focus(); return; }
            if (!code || code.length !== 4) { codeInput.focus(); return; }
            this.playerName = name;
            this.isHost = false;
            this.socket.emit(EVENTS.ROOM_JOIN, { code, playerName: name });
        });
    }

    /** Lobby: waiting room with player list */
    _renderLobby(room) {
        this.currentRoom = room;
        const isHost = room.host === this.playerId;

        this.container.innerHTML = `
            <div class="jto jto-lobby">
                <div class="jto-lobby__code-section">
                    <span class="jto-lobby__code-label">Code de la salle</span>
                    <div class="jto-lobby__code">${room.code}</div>
                    <span class="jto-lobby__code-hint">Donne ce code à tes amis !</span>
                </div>

                <div class="jto-lobby__players">
                    <h3 class="jto-lobby__players-title">Joueurs connectés (${room.players.length})</h3>
                    <ul class="jto-lobby__list" id="jto-players-list">
                        ${room.players.map(p => `
                            <li class="jto-lobby__player ${p.id === room.host ? 'is-host' : ''}">
                                <span class="jto-lobby__player-avatar">${this._getAvatar(p.name)}</span>
                                <span class="jto-lobby__player-name">${p.name}</span>
                                ${p.id === room.host ? '<span class="jto-lobby__host-badge">Hôte</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                ${isHost ? `
                    <button class="jto-btn jto-btn--primary jto-start-btn" id="jto-start-btn"
                        ${room.players.length < 3 ? 'disabled' : ''}>
                        ${room.players.length < 3
                    ? `Encore ${3 - room.players.length} joueur(s)…`
                    : '🎮 Lancer la partie !'}
                    </button>
                ` : `
                    <p class="jto-lobby__waiting">En attente du lancement par l'hôte…</p>
                `}
            </div>
        `;

        if (isHost) {
            document.getElementById('jto-start-btn')?.addEventListener('click', () => {
                this.socket.emit(EVENTS.GAME_START, { code: room.code });
            });
        }
    }

    /** number_selection: guesser picks 1-5 */
    _renderNumberSelection(state, iAmGuesser, guesser) {
        const card = state.deck[state.currentCardIndex];

        this.container.innerHTML = `
            <div class="jto jto-game">
                ${this._renderScoreboard(state)}

                <div class="jto-phase-label">
                    Round ${state.round} / ${state.totalRounds}
                    — ${guesser?.name} doit deviner
                </div>

                ${iAmGuesser ? `
                    <div class="jto-card-reveal">
                        <p class="jto-card-reveal__instruction">
                            Choisis un chiffre de 1 à 5.<br>
                            <strong>Ne regarde pas les mots !</strong>
                        </p>
                        <div class="jto-number-grid">
                            ${[1, 2, 3, 4, 5].map(n => `
                                <button class="jto-number-btn" id="jto-num-${n}" data-n="${n}">${n}</button>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="jto-waiting-screen">
                        <div class="jto-card-view">
                            ${card.words.map((w, i) => `
                                <div class="jto-card-word">
                                    <span class="jto-card-word__num">${i + 1}</span>
                                    <span class="jto-card-word__text">${w}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p class="jto-waiting-label">
                            ⏳ ${guesser?.name} choisit un chiffre…
                        </p>
                    </div>
                `}
            </div>
        `;

        if (iAmGuesser) {
            this.container.querySelectorAll('.jto-number-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.socket.emit(EVENTS.GAME_ACTION, {
                        code: this.currentRoom.code,
                        type: 'SELECT_NUMBER',
                        payload: { number: parseInt(btn.dataset.n) },
                    });
                });
            });
        }
    }

    /** clue_giving: non-guessers type a clue */
    _renderClueGiving(state, iAmGuesser, guesser) {
        const submittedCount = Object.keys(state.clues).length;
        const totalClueGivers = state.players.length - 1;
        const iHaveSubmitted = !!state.clues[this.playerId];
        const secretWord = state.secretWord;

        this.container.innerHTML = `
            <div class="jto jto-game">
                ${this._renderScoreboard(state)}

                <div class="jto-phase-label">
                    ✍️ Phase d'indices${iAmGuesser ? '' : ` — Mot caché : <span class="jto-word-secret">${secretWord || '?'}</span>`}
                </div>

                ${iAmGuesser ? `
                    <div class="jto-waiting-screen">
                        <div class="jto-eyes-closed">😴</div>
                        <p class="jto-waiting-label">Ferme les yeux, ${guesser?.name} !<br>
                            <strong>${submittedCount} / ${totalClueGivers}</strong> indices soumis
                        </p>
                    </div>
                ` : iHaveSubmitted ? `
                    <div class="jto-waiting-screen">
                        <div class="jto-submitted-badge">✅ Indice soumis !</div>
                        <p class="jto-waiting-label">
                            <strong>${submittedCount} / ${totalClueGivers}</strong> joueurs ont soumis leur indice.<br>
                            En attente des autres…
                        </p>
                    </div>
                ` : `
                    <div class="jto-clue-input-area">
                        <p class="jto-clue-instruction">
                            Le mot mystère est : <strong class="jto-word-secret">${secretWord}</strong><br>
                            Donne un seul mot pour aider ${guesser?.name}.
                        </p>
                        <div class="jto-clue-form">
                            <input
                                class="jto-input jto-input--big"
                                id="jto-clue-input"
                                type="text"
                                placeholder="Ton indice…"
                                maxlength="30"
                                autocomplete="off"
                                autofocus
                            />
                            <button class="jto-btn jto-btn--primary" id="jto-clue-submit">
                                Envoyer ✦
                            </button>
                        </div>
                        <p class="jto-clue-reminder">⚠️ Un seul mot. Les doublons sont éliminés.</p>
                    </div>
                `}
            </div>
        `;

        if (!iAmGuesser && !iHaveSubmitted) {
            const input = document.getElementById('jto-clue-input');
            const submitClue = () => {
                const word = input.value.trim();
                if (!word) { input.focus(); return; }
                this.socket.emit(EVENTS.GAME_ACTION, {
                    code: this.currentRoom.code,
                    type: 'SUBMIT_CLUE',
                    payload: { word },
                });
            };
            document.getElementById('jto-clue-submit').addEventListener('click', submitClue);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') submitClue(); });
        }
    }

    /** guessing: active guesser sees valid clues and types a guess */
    _renderGuessing(state, iAmGuesser, guesser) {
        const validClues = Object.entries(state.clues)
            .filter(([, c]) => c.valid)
            .map(([pid, c]) => {
                const player = state.players.find(p => p.id === pid);
                return { ...c, playerName: player?.name || pid };
            });

        const invalidCount = Object.values(state.clues).filter(c => !c.valid).length;

        this.container.innerHTML = `
            <div class="jto jto-game">
                ${this._renderScoreboard(state)}

                <div class="jto-phase-label">
                    🔍 Phase de devinette
                </div>

                ${invalidCount > 0 ? `
                    <div class="jto-eliminated-notice">
                        <span>🚫 ${invalidCount} indice(s) éliminé(s) car en double</span>
                    </div>
                ` : ''}

                <div class="jto-clues-display">
                    ${validClues.length === 0
                ? `<p class="jto-no-clues">Tous les indices ont été annulés… 😬</p>`
                : validClues.map(c => `
                            <div class="jto-clue-card">
                                <span class="jto-clue-card__word">${c.word}</span>
                                <span class="jto-clue-card__from">de ${c.playerName}</span>
                            </div>
                        `).join('')
            }
                </div>

                ${iAmGuesser ? `
                    <div class="jto-guess-area">
                        <p class="jto-guess-instruction">C'est ton tour, ${guesser?.name} ! Quel est le mot mystère ?</p>
                        <div class="jto-clue-form">
                            <input
                                class="jto-input jto-input--big"
                                id="jto-guess-input"
                                type="text"
                                placeholder="Ton mot mystère…"
                                maxlength="30"
                                autocomplete="off"
                                autofocus
                            />
                            <button class="jto-btn jto-btn--primary" id="jto-guess-submit">✔ Répondre</button>
                        </div>
                        <button class="jto-btn jto-btn--ghost" id="jto-guess-pass">↩ Passer (perd la carte)</button>
                    </div>
                ` : `
                    <p class="jto-waiting-label">
                        ⏳ ${guesser?.name} réfléchit…
                    </p>
                `}
            </div>
        `;

        if (iAmGuesser) {
            const input = document.getElementById('jto-guess-input');
            const submitGuess = () => {
                const word = input.value.trim();
                if (!word) { input.focus(); return; }
                this.socket.emit(EVENTS.GAME_ACTION, {
                    code: this.currentRoom.code,
                    type: 'SUBMIT_GUESS',
                    payload: { word },
                });
            };
            document.getElementById('jto-guess-submit').addEventListener('click', submitGuess);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });
            document.getElementById('jto-guess-pass').addEventListener('click', () => {
                this.socket.emit(EVENTS.GAME_ACTION, {
                    code: this.currentRoom.code,
                    type: 'PASS',
                    payload: {},
                });
            });
        }
    }

    /** scoring: show round result and a "next round" button (host only) */
    _renderScoring(state) {
        const last = state.roundResults[state.roundResults.length - 1];
        const colorClass = last.result === 'success' ? 'is-success' : last.result === 'pass' ? 'is-pass' : 'is-fail';
        const isHost = this.currentRoom?.host === this.playerId;

        this.container.innerHTML = `
            <div class="jto jto-game">
                ${this._renderScoreboard(state)}

                <div class="jto-result ${colorClass}">
                    <div class="jto-result__icon">
                        ${last.result === 'success' ? '✅' : last.result === 'pass' ? '⏭️' : '❌'}
                    </div>
                    <div class="jto-result__word">${last.secretWord}</div>
                    ${last.guess ? `<div class="jto-result__guess">Réponse : «${last.guess}»</div>` : ''}
                    <p class="jto-result__msg">${state.message || ''}</p>
                    ${last.extraCardLost ? `<p class="jto-result__penalty">⚠️ Mauvaise réponse : la prochaine carte est aussi perdue !</p>` : ''}
                </div>

                <div class="jto-clues-display jto-clues-display--reveal">
                    <h4>Tous les indices :</h4>
                    ${Object.entries(last.clues).map(([pid, c]) => {
            const player = state.players.find(p => p.id === pid);
            return `
                            <div class="jto-clue-card ${!c.valid ? 'is-invalid' : ''}">
                                <span class="jto-clue-card__word">${c.word}</span>
                                <span class="jto-clue-card__from">
                                    ${player?.name || pid}
                                    ${!c.valid ? '· <em>éliminé</em>' : ''}
                                </span>
                            </div>
                        `;
        }).join('')}
                </div>

                ${isHost ? `
                    <button class="jto-btn jto-btn--primary jto-next-btn" id="jto-next-btn">
                        Prochain round →
                    </button>
                ` : `
                    <p class="jto-waiting-label">En attente de l'hôte pour le prochain round…</p>
                `}
            </div>
        `;

        if (isHost) {
            document.getElementById('jto-next-btn').addEventListener('click', () => {
                this.socket.emit(EVENTS.GAME_ACTION, {
                    code: this.currentRoom.code,
                    type: 'NEXT_ROUND',
                    payload: {},
                });
            });
        }
    }

    /** game_over: final score screen */
    _renderGameOver(state) {
        const score = state.score ?? state.score;
        const total = state.totalRounds ?? 13;

        this.container.innerHTML = `
            <div class="jto jto-gameover">
                <div class="jto-gameover__icon">🫐</div>
                <h2 class="jto-gameover__title">Partie terminée !</h2>
                <div class="jto-gameover__score">
                    <span class="jto-gameover__score-num">${score}</span>
                    <span class="jto-gameover__score-total">/ ${total}</span>
                </div>
                <p class="jto-gameover__msg">${state.message || ''}</p>

                <div class="jto-gameover__rounds">
                    ${(state.roundResults || []).map(r => `
                        <div class="jto-gameover__round ${r.result === 'success' ? 'is-success' : r.result === 'pass' ? 'is-pass' : 'is-fail'}">
                            <span class="jto-gameover__round-word">${r.secretWord}</span>
                            <span>${r.result === 'success' ? '✅' : r.result === 'pass' ? '⏭️' : '❌'}</span>
                        </div>
                    `).join('')}
                </div>

                ${this.currentRoom?.host === this.playerId ? `
                    <button class="jto-btn jto-btn--primary" id="jto-restart-btn">🔄 Rejouer</button>
                ` : ''}
            </div>
        `;

        document.getElementById('jto-restart-btn')?.addEventListener('click', () => {
            this.socket.emit(EVENTS.GAME_START, { code: this.currentRoom.code });
        });
    }

    // ─── Shared Sub-Components ────────────────────────────────

    _renderScoreboard(state) {
        return `
            <div class="jto-scoreboard">
                <div class="jto-scoreboard__item">
                    <span class="jto-scoreboard__label">Score</span>
                    <span class="jto-scoreboard__value is-success">${state.score}</span>
                </div>
                <div class="jto-scoreboard__item">
                    <span class="jto-scoreboard__label">Carte</span>
                    <span class="jto-scoreboard__value">${state.currentCardIndex + 1} / ${state.totalRounds}</span>
                </div>
                <div class="jto-scoreboard__item">
                    <span class="jto-scoreboard__label">Joueurs</span>
                    <span class="jto-scoreboard__value">${state.players.map(p => p.id === state.players[state.guesserIndex]?.id ? `<strong>${p.name}</strong>` : p.name).join(', ')}</span>
                </div>
            </div>
        `;
    }

    _getAvatar(name) {
        const emojis = ['🍇', '🫐', '🍒', '🍑', '🥝', '🍋', '🍊', '🍎', '🍓', '🫚'];
        return emojis[name.charCodeAt(0) % emojis.length];
    }

    _showError(message) {
        const err = document.createElement('div');
        err.className = 'jto-error-toast';
        err.textContent = message;
        this.container.appendChild(err);
        setTimeout(() => err.remove(), 3500);
    }

    destroy() {
        if (this.socket) {
            this.socket.off(EVENTS.ROOM_UPDATE);
            this.socket.off(EVENTS.GAME_STATE);
            this.socket.off(EVENTS.GAME_END);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
