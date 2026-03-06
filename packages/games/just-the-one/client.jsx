import { useState, useEffect, useCallback, useRef } from 'react';
import { EVENTS, getPlayerId } from '@myrtille/shared';

// ─── Helpers ─────────────────────────────────────────────────

function getAvatar(name) {
    const emojis = ['🍇', '🫐', '🍒', '🍑', '🥝', '🍋', '🍊', '🍎', '🍓', '🫚'];
    return emojis[name.charCodeAt(0) % emojis.length];
}

// ─── Sub-Components ──────────────────────────────────────────

function GameHeader({ state }) {
    return (
        <div className="jto-hud">
            <div className="jto-hud__panel jto-hud__score">
                <div className="jto-hud__label">SCORE</div>
                <div className="jto-hud__display jto-hud__display--glow">
                    {String(state.score).padStart(2, '0')}
                </div>
            </div>

            <div className="jto-hud__panel jto-hud__round">
                <div className="jto-hud__label">CARTE</div>
                <div className="jto-hud__display">
                    {state.currentCardIndex + 1}<span className="jto-hud__display-total">/{state.totalRounds}</span>
                </div>
            </div>
        </div>
    );
}

function PlayerRoster({ state }) {
    const guesserIndex = state.guesserIndex;
    const guesser = state.players[guesserIndex];

    return (
        <div className="jto-roster">
            {state.players.map((p) => {
                const isGuesser = p.id === guesser?.id;
                const isOffline = p.online === false;

                let statusText = isGuesser ? "Devineur" : "Indicateur";
                let statusClass = isGuesser ? "is-guesser" : "is-giver";

                if (isOffline) {
                    statusText = "Déconnecté";
                    statusClass = "is-offline";
                } else if (state.phase === 'clue_giving' && !isGuesser) {
                    const hasSubmitted = !!state.clues[p.id];
                    if (hasSubmitted) {
                        statusText = "Prêt";
                        statusClass = "is-ready";
                    } else {
                        statusText = "Réfléchit...";
                        statusClass = "is-thinking";
                    }
                }

                return (
                    <div key={p.id} className={`jto-roster__chip ${statusClass}`}>
                        <div className="jto-roster__avatar">{getAvatar(p.name)}</div>
                        <div className="jto-roster__info">
                            <span className="jto-roster__name">{p.name}</span>
                            <span className="jto-roster__status">{statusText}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ErrorToast({ message, onDone }) {
    useEffect(() => {
        const timer = setTimeout(onDone, 3500);
        return () => clearTimeout(timer);
    }, [onDone]);

    return <div className="jto-error-toast">{message}</div>;
}

// ─── Title Screen ────────────────────────────────────────────

function TitleScreen({ socket }) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const nameRef = useRef(null);
    const codeRef = useRef(null);

    const handleCreate = () => {
        if (!name.trim()) { nameRef.current?.focus(); return; }
        socket.emit(EVENTS.ROOM_CREATE, { gameId: 'just-the-one', playerName: name.trim(), playerId: getPlayerId() });
    };

    const handleJoin = () => {
        if (!name.trim()) { nameRef.current?.focus(); return; }
        if (!code.trim() || code.trim().length !== 4) { codeRef.current?.focus(); return; }
        socket.emit(EVENTS.ROOM_JOIN, { code: code.trim().toUpperCase(), playerName: name.trim(), playerId: getPlayerId() });
    };

    return (
        <div className="jto jto-title">
            <div className="jto-logo">🎯</div>
            <h1 className="jto-title__name">Just the One</h1>
            <p className="jto-title__sub">Indice unique · Coopératif · 3–10 joueurs</p>

            <div className="jto-form">
                <input
                    ref={nameRef}
                    className="jto-input"
                    id="jto-name-input"
                    type="text"
                    placeholder="Ton pseudo..."
                    maxLength={20}
                    autoComplete="off"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <div className="jto-title__actions">
                    <button className="jto-btn jto-btn--primary" id="jto-create-btn" onClick={handleCreate}>
                        ✦ Créer une partie
                    </button>
                    <div className="jto-divider">ou</div>
                    <div className="jto-join-row">
                        <input
                            ref={codeRef}
                            className="jto-input jto-input--code"
                            id="jto-code-input"
                            type="text"
                            placeholder="CODE"
                            maxLength={4}
                            autoComplete="off"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                        />
                        <button className="jto-btn jto-btn--secondary" id="jto-join-btn" onClick={handleJoin}>
                            Rejoindre
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Lobby ───────────────────────────────────────────────────

function Lobby({ room, socket, playerId }) {
    const isHost = room.host === playerId;

    const handleStart = () => {
        socket.emit(EVENTS.GAME_START, { code: room.code });
    };

    return (
        <div className="jto jto-lobby">
            <div className="jto-lobby__code-section">
                <span className="jto-lobby__code-label">Code de la salle</span>
                <div className="jto-lobby__code">{room.code}</div>
                <span className="jto-lobby__code-hint">Donne ce code à tes amis !</span>
            </div>

            <div className="jto-lobby__players">
                <h3 className="jto-lobby__players-title">Joueurs connectés ({room.players.length})</h3>
                <ul className="jto-lobby__list" id="jto-players-list">
                    {room.players.map(p => (
                        <li key={p.id} className={`jto-lobby__player ${p.id === room.host ? 'is-host' : ''} ${!p.online ? 'is-offline' : ''}`}>
                            <span className="jto-lobby__player-avatar">{getAvatar(p.name)}</span>
                            <span className="jto-lobby__player-name">
                                {p.name}
                                {!p.online && <span className="jto-lobby__offline-tag"> (déconnecté)</span>}
                            </span>
                            {p.id === room.host && <span className="jto-lobby__host-badge">Hôte</span>}
                        </li>
                    ))}
                </ul>
            </div>

            {isHost ? (
                <button
                    className="jto-btn jto-btn--primary jto-start-btn"
                    id="jto-start-btn"
                    disabled={room.players.length < 3}
                    onClick={handleStart}
                >
                    {room.players.length < 3
                        ? `Encore ${3 - room.players.length} joueur(s)…`
                        : '🎮 Lancer la partie !'}
                </button>
            ) : (
                <p className="jto-lobby__waiting">En attente du lancement par l'hôte…</p>
            )}
        </div>
    );
}

// ─── Number Selection ────────────────────────────────────────

function NumberSelection({ state, iAmGuesser, guesser, socket, roomCode }) {
    const card = state.deck[state.currentCardIndex];

    const handleSelect = (n) => {
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'SELECT_NUMBER',
            payload: { number: n },
        });
    };

    return (
        <div className="jto jto-game">
            <GameHeader state={state} />
            <PlayerRoster state={state} />

            <div className="jto-phase-label">
                Tour {state.round} — {guesser?.name} doit deviner
            </div>

            {iAmGuesser ? (
                <div className="jto-card-reveal">
                    <p className="jto-card-reveal__instruction">
                        Choisis un chiffre de 1 à 5.<br />
                        <strong>Ne regarde pas les mots !</strong>
                    </p>
                    <div className="jto-number-grid">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                className="jto-number-btn"
                                id={`jto-num-${n}`}
                                onClick={() => handleSelect(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="jto-waiting-screen">
                    <div className="jto-card-view">
                        {card.words.map((w, i) => (
                            <div key={i} className="jto-card-word">
                                <span className="jto-card-word__num">{i + 1}</span>
                                <span className="jto-card-word__text">{w}</span>
                            </div>
                        ))}
                    </div>
                    <p className="jto-waiting-label">
                        ⏳ {guesser?.name} choisit un chiffre…
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Clue Giving ─────────────────────────────────────────────

function ClueGiving({ state, iAmGuesser, guesser, socket, roomCode, playerId }) {
    const [clueInput, setClueInput] = useState('');
    const clueRef = useRef(null);
    const submittedCount = Object.keys(state.clues).length;
    const totalClueGivers = state.players.length - 1;
    const iHaveSubmitted = !!state.clues[playerId];
    const secretWord = state.secretWord;

    const submitClue = () => {
        const word = clueInput.trim();
        if (!word) { clueRef.current?.focus(); return; }
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'SUBMIT_CLUE',
            payload: { word },
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') submitClue();
    };

    return (
        <div className="jto jto-game">
            <GameHeader state={state} />
            <PlayerRoster state={state} />

            <div className="jto-phase-label">
                ✍️ Phase d'indices
                {!iAmGuesser && (
                    <> — Mot caché : <span className="jto-word-secret">{secretWord || '?'}</span></>
                )}
            </div>

            {iAmGuesser ? (
                <div className="jto-waiting-screen">
                    <div className="jto-eyes-closed">😴</div>
                    <p className="jto-waiting-label">
                        Ferme les yeux, {guesser?.name} !<br />
                        <strong>{submittedCount} / {totalClueGivers}</strong> indices soumis
                    </p>
                </div>
            ) : iHaveSubmitted ? (
                <div className="jto-waiting-screen">
                    <div className="jto-submitted-badge">✅ Indice soumis !</div>
                    <p className="jto-waiting-label">
                        <strong>{submittedCount} / {totalClueGivers}</strong> joueurs ont soumis leur indice.<br />
                        En attente des autres…
                    </p>
                </div>
            ) : (
                <div className="jto-clue-input-area">
                    <p className="jto-clue-instruction">
                        Le mot mystère est : <strong className="jto-word-secret">{secretWord}</strong><br />
                        Donne un seul mot pour aider {guesser?.name}.
                    </p>
                    <div className="jto-clue-form">
                        <input
                            ref={clueRef}
                            className="jto-input jto-input--big"
                            id="jto-clue-input"
                            type="text"
                            placeholder="Ton indice…"
                            maxLength={30}
                            autoComplete="off"
                            autoFocus
                            value={clueInput}
                            onChange={e => setClueInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="jto-btn jto-btn--primary" id="jto-clue-submit" onClick={submitClue}>
                            Envoyer ✦
                        </button>
                    </div>
                    <p className="jto-clue-reminder">⚠️ Un seul mot. Les doublons sont éliminés.</p>
                </div>
            )}
        </div>
    );
}

// ─── Guessing ────────────────────────────────────────────────

function Guessing({ state, iAmGuesser, guesser, socket, roomCode }) {
    const [guessInput, setGuessInput] = useState('');
    const guessRef = useRef(null);

    const validClues = Object.entries(state.clues)
        .filter(([, c]) => c.valid)
        .map(([pid, c]) => {
            const player = state.players.find(p => p.id === pid);
            return { ...c, playerName: player?.name || pid };
        });

    const invalidCount = Object.values(state.clues).filter(c => !c.valid).length;

    const submitGuess = () => {
        const word = guessInput.trim();
        if (!word) { guessRef.current?.focus(); return; }
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'SUBMIT_GUESS',
            payload: { word },
        });
    };

    const handlePass = () => {
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'PASS',
            payload: {},
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') submitGuess();
    };

    return (
        <div className="jto jto-game">
            <GameHeader state={state} />
            <PlayerRoster state={state} />

            <div className="jto-phase-label">🔍 Phase de devinette</div>

            {invalidCount > 0 && (
                <div className="jto-eliminated-notice">
                    <span>🚫 {invalidCount} indice(s) éliminé(s) car en double</span>
                </div>
            )}

            <div className="jto-clues-display">
                {validClues.length === 0 ? (
                    <p className="jto-no-clues">Tous les indices ont été annulés… 😬</p>
                ) : (
                    validClues.map((c, i) => (
                        <div key={i} className="jto-clue-card">
                            <span className="jto-clue-card__word">{c.word}</span>
                            <span className="jto-clue-card__from">de {c.playerName}</span>
                        </div>
                    ))
                )}
            </div>

            {iAmGuesser ? (
                <div className="jto-guess-area">
                    <p className="jto-guess-instruction">C'est ton tour, {guesser?.name} ! Quel est le mot mystère ?</p>
                    <div className="jto-clue-form">
                        <input
                            ref={guessRef}
                            className="jto-input jto-input--big"
                            id="jto-guess-input"
                            type="text"
                            placeholder="Ton mot mystère…"
                            maxLength={30}
                            autoComplete="off"
                            autoFocus
                            value={guessInput}
                            onChange={e => setGuessInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="jto-btn jto-btn--primary" id="jto-guess-submit" onClick={submitGuess}>
                            ✔ Répondre
                        </button>
                    </div>
                    <button className="jto-btn jto-btn--ghost" id="jto-guess-pass" onClick={handlePass}>
                        ↩ Passer (perd la carte)
                    </button>
                </div>
            ) : (
                <p className="jto-waiting-label">⏳ {guesser?.name} réfléchit…</p>
            )}
        </div>
    );
}

// ─── Scoring ─────────────────────────────────────────────────

function Scoring({ state, socket, roomCode, isHost }) {
    const last = state.roundResults[state.roundResults.length - 1];
    const colorClass = last.result === 'success' ? 'is-success' : last.result === 'pass' ? 'is-pass' : 'is-fail';

    const handleNext = () => {
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'NEXT_ROUND',
            payload: {},
        });
    };

    const handleValidate = () => {
        socket.emit(EVENTS.GAME_ACTION, {
            code: roomCode,
            type: 'VALIDATE_GUESS',
            payload: { isHost: true },
        });
    };

    return (
        <div className="jto jto-game">
            <GameHeader state={state} />
            <PlayerRoster state={state} />

            <div className={`jto-result ${colorClass}`}>
                <div className="jto-result__icon">
                    {last.result === 'success' ? '✅' : last.result === 'pass' ? '⏭️' : '❌'}
                </div>
                <div className="jto-result__word">{last.secretWord}</div>
                {last.guess && <div className="jto-result__guess">Réponse : «{last.guess}»</div>}
                <p className="jto-result__msg">{state.message || ''}</p>
                {last.extraCardLost && (
                    <p className="jto-result__penalty">⚠️ Mauvaise réponse : la prochaine carte est aussi perdue !</p>
                )}

                {isHost && last.result !== 'success' && (
                    <button className="jto-btn jto-btn--secondary jto-validate-btn" onClick={handleValidate}>
                        💎 C'est bon, on valide !
                    </button>
                )}
            </div>

            <div className="jto-clues-display jto-clues-display--reveal">
                <h4>Tous les indices :</h4>
                {Object.entries(last.clues).map(([pid, c]) => {
                    const player = state.players.find(p => p.id === pid);
                    return (
                        <div key={pid} className={`jto-clue-card ${!c.valid ? 'is-invalid' : ''}`}>
                            <span className="jto-clue-card__word">{c.word}</span>
                            <span className="jto-clue-card__from">
                                {player?.name || pid}
                                {!c.valid && ' · '}{!c.valid && <em>éliminé</em>}
                            </span>
                        </div>
                    );
                })}
            </div>

            {isHost ? (
                <button className="jto-btn jto-btn--primary jto-next-btn" id="jto-next-btn" onClick={handleNext}>
                    Prochain round →
                </button>
            ) : (
                <p className="jto-waiting-label">En attente de l'hôte pour le prochain round…</p>
            )}
        </div>
    );
}

// ─── Game Over ───────────────────────────────────────────────

function GameOver({ state, socket, roomCode, isHost }) {
    const score = state.score ?? 0;
    const total = state.totalRounds ?? 13;

    const handleRestart = () => {
        socket.emit(EVENTS.GAME_START, { code: roomCode });
    };

    return (
        <div className="jto jto-gameover">
            <div className="jto-gameover__icon">🫐</div>
            <h2 className="jto-gameover__title">Partie terminée !</h2>
            <div className="jto-gameover__score">
                <span className="jto-gameover__score-num">{score}</span>
                <span className="jto-gameover__score-total">/ {total}</span>
            </div>
            <p className="jto-gameover__msg">{state.message || ''}</p>

            <div className="jto-gameover__rounds">
                {(state.roundResults || []).map((r, i) => (
                    <div key={i} className={`jto-gameover__round ${r.result === 'success' ? 'is-success' : r.result === 'pass' ? 'is-pass' : 'is-fail'}`}>
                        <span className="jto-gameover__round-word">{r.secretWord}</span>
                        <span>{r.result === 'success' ? '✅' : r.result === 'pass' ? '⏭️' : '❌'}</span>
                    </div>
                ))}
            </div>

            {isHost && (
                <button className="jto-btn jto-btn--primary" id="jto-restart-btn" onClick={handleRestart}>
                    🔄 Rejouer
                </button>
            )}
        </div>
    );
}

// ─── Main JustTheOne Component ───────────────────────────────

export function JustTheOne({ socket }) {
    const [phase, setPhase] = useState('title'); // title | lobby | game
    const [room, setRoom] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(getPlayerId());
    const [error, setError] = useState(null);

    // Track player ID (handled by getPlayerId now, but we keep it in state for clarity)
    useEffect(() => {
        setPlayerId(getPlayerId());
    }, []);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const onRoomUpdate = (roomData) => {
            setRoom(roomData);
            // Only go to lobby if we're not already in a game
            setPhase(prev => prev === 'game' ? prev : 'lobby');
        };

        const onGameState = (state) => {
            setGameState(state);
            setPhase('game');
        };

        const onGameEnd = (results) => {
            setGameState(prev => ({ ...prev, ...results, phase: 'game_over' }));
            setPhase('game');
        };

        const onError = ({ message }) => {
            setError(message);
        };

        socket.on(EVENTS.ROOM_UPDATE, onRoomUpdate);
        socket.on(EVENTS.GAME_STATE, onGameState);
        socket.on(EVENTS.GAME_END, onGameEnd);
        socket.on(EVENTS.ERROR, onError);

        return () => {
            socket.off(EVENTS.ROOM_UPDATE, onRoomUpdate);
            socket.off(EVENTS.GAME_STATE, onGameState);
            socket.off(EVENTS.GAME_END, onGameEnd);
            socket.off(EVENTS.ERROR, onError);
        };
    }, [socket]);

    const roomCode = room?.code || null;
    const isHost = room?.host === playerId;

    // ─── Render based on phase ───────────────────────────────

    const renderGame = () => {
        if (!gameState) return null;

        const guesser = gameState.players[gameState.guesserIndex];
        const iAmGuesser = guesser?.id === playerId;

        switch (gameState.phase) {
            case 'number_selection':
                return <NumberSelection state={gameState} iAmGuesser={iAmGuesser} guesser={guesser} socket={socket} roomCode={roomCode} />;
            case 'clue_giving':
                return <ClueGiving state={gameState} iAmGuesser={iAmGuesser} guesser={guesser} socket={socket} roomCode={roomCode} playerId={playerId} />;
            case 'guessing':
                return <Guessing state={gameState} iAmGuesser={iAmGuesser} guesser={guesser} socket={socket} roomCode={roomCode} />;
            case 'scoring':
                return <Scoring state={gameState} socket={socket} roomCode={roomCode} isHost={isHost} />;
            case 'game_over':
                return <GameOver state={gameState} socket={socket} roomCode={roomCode} isHost={isHost} />;
            default:
                return null;
        }
    };

    return (
        <>
            {phase === 'title' && <TitleScreen socket={socket} />}
            {phase === 'lobby' && room && <Lobby room={room} socket={socket} playerId={playerId} />}
            {phase === 'game' && renderGame()}
            {error && <ErrorToast message={error} onDone={() => setError(null)} />}
        </>
    );
}
