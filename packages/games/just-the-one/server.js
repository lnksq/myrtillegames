import { GameServer } from '@myrtille/engine';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load the word bank
const __dirname = dirname(fileURLToPath(import.meta.url));
const ALL_CARDS = JSON.parse(readFileSync(join(__dirname, 'data/cards.json'), 'utf-8'));

// ─── Duplicate Detection ──────────────────────────────────────

/**
 * Normalize a word for comparison:
 * - lowercase
 * - remove accents (NFD + strip combining marks)
 * - trim whitespace
 * - collapse multiple spaces
 */
function normalize(word) {
    return word
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/\s+/g, ' ');
}

/**
 * Given an array of clue submissions, return which ones are "invalid"
 * (duplicates or from same word family). Invalid entries will be hidden from the guesser.
 *
 * @param {{ playerId: string, word: string }[]} submissions
 * @returns {Set<string>} — set of playerIds whose clues are invalidated
 */
function findInvalidClues(submissions) {
    const normalized = submissions.map(s => ({
        ...s,
        norm: normalize(s.word),
    }));

    const invalidIds = new Set();

    for (let i = 0; i < normalized.length; i++) {
        for (let j = i + 1; j < normalized.length; j++) {
            const a = normalized[i];
            const b = normalized[j];
            if (areSameFamily(a.norm, b.norm)) {
                invalidIds.add(a.playerId);
                invalidIds.add(b.playerId);
            }
        }
    }

    return invalidIds;
}

/**
 * Two words are "same family" if they are identical after normalization,
 * or one is a simple plural/feminine variant of the other.
 */
function areSameFamily(a, b) {
    if (a === b) return true;
    // Simple plural/gender: add or remove trailing 's' or 'e' or 'es'
    const variants = w => [
        w,
        w.replace(/s$/, ''),
        w.replace(/es$/, ''),
        w.replace(/e$/, ''),
        w + 's',
        w + 'e',
        w + 'es',
    ];
    const vA = variants(a);
    const vB = variants(b);
    return vA.some(v => vB.includes(v));
}

/**
 * Simple Levenshtein distance for fuzzy matching.
 */
function levenshtein(a, b) {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) {
        tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}

/**
 * Check a guess against the secret word.
 * Lenient: same family OR Levenshtein distance <= 2 (for words > 4 chars) or 1 (for shorter).
 */
function isCorrectGuess(guess, secretWord) {
    const g = normalize(guess);
    const s = normalize(secretWord);
    if (areSameFamily(g, s)) return true;

    const distance = levenshtein(g, s);
    const threshold = s.length > 4 ? 2 : 1;
    return distance <= threshold;
}

// ─── Just the One — Game Server ──────────────────────────────
export class JustTheOneServer extends GameServer {
    static id = 'just-the-one';

    /**
     * Called when the host starts the game.
     * Returns the initial state broadcast to all clients.
     */
    initialize(room) {
        // Shuffle the card deck and pick 13 cards for this game
        const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
        const deck = shuffled.slice(0, 13);

        const players = room.players;
        const guesserIndex = 0;

        return {
            phase: 'number_selection',   // number_selection → clue_giving → clue_resolution → guessing → scoring
            deck,
            currentCardIndex: 0,
            chosenNumber: null,          // 1–5 chosen by the active guesser
            secretWord: null,            // revealed to server only, sent to non-guessers
            clues: {},                   // { playerId: { word: string, valid: boolean } }
            guess: null,
            result: null,               // 'success' | 'fail' | 'pass'
            roundResults: [],           // history of each round's outcome
            score: 0,                   // number of cards successfully guessed
            cardsLost: 0,               // cards lost due to wrong guesses
            players,
            guesserIndex,
            round: 1,
            totalRounds: 13,
            message: null,
            manualValidation: false,     // track if host overrode the result
        };
    }

    handleAction(action, state, room) {
        switch (action.type) {

            // ── Phase 1: Active guesser picks a number (1-5) ────
            case 'SELECT_NUMBER': {
                if (state.phase !== 'number_selection') return state;

                const guesser = state.players[state.guesserIndex];
                if (action.playerId !== guesser.id) return state; // only guesser can act

                const num = parseInt(action.payload.number, 10);
                if (num < 1 || num > 5) return state;

                const card = state.deck[state.currentCardIndex];
                const secretWord = card.words[num - 1];

                return {
                    ...state,
                    phase: 'clue_giving',
                    chosenNumber: num,
                    secretWord,
                    clues: {},
                    guess: null,
                    result: null,
                    message: 'Tous les autres joueurs doivent écrire un indice !',
                };
            }

            // ── Phase 2: Each non-guesser submits a clue ────────
            case 'SUBMIT_CLUE': {
                if (state.phase !== 'clue_giving') return state;

                const guesser = state.players[state.guesserIndex];
                if (action.playerId === guesser.id) return state; // guesser can't give clues

                const word = (action.payload.word || '').trim();
                if (!word) return state;

                const updatedClues = {
                    ...state.clues,
                    [action.playerId]: { word, valid: true }, // valid will be determined at resolution
                };

                // Check if all online non-guesser players have submitted
                const nonGuessers = state.players.filter(p => p.id !== guesser.id && p.online !== false);
                const allSubmitted = nonGuessers.every(p => updatedClues[p.id]);

                if (allSubmitted) {
                    // Move to resolution: detect duplicates
                    return this._resolveClues({ ...state, clues: updatedClues });
                }

                return { ...state, clues: updatedClues };
            }

            // ── Phase 3 (manual): Force resolution early (host action) ─
            case 'FORCE_RESOLVE': {
                if (state.phase !== 'clue_giving') return state;
                const guesser = state.players[state.guesserIndex];
                const isHost = room && room.host === action.playerId;
                if (action.playerId !== guesser.id && !isHost) return state;
                return this._resolveClues(state);
            }

            // ── Phase 4: Active guesser submits a guess ──────────
            case 'SUBMIT_GUESS': {
                if (state.phase !== 'guessing') return state;

                const guesser = state.players[state.guesserIndex];
                if (action.playerId !== guesser.id) return state;

                const guess = (action.payload.word || '').trim();
                if (!guess) return state;

                const correct = isCorrectGuess(guess, state.secretWord);
                const result = correct ? 'success' : 'fail';

                return this._scoreRound({ ...state, guess, result });
            }

            // ── Phase 4 (alt): Active guesser passes ─────────────
            case 'PASS': {
                if (state.phase !== 'guessing') return state;

                const guesser = state.players[state.guesserIndex];
                if (action.playerId !== guesser.id) return state;

                return this._scoreRound({ ...state, guess: null, result: 'pass' });
            }

            // ── Phase 5 (Override): Host manually validates the word ─────────────
            case 'VALIDATE_GUESS': {
                if (state.phase !== 'scoring') return state;
                const isHost = room && room.host === action.playerId;
                if (!isHost) return state;
                if (state.result === 'success') return state; // already success

                // Re-score the round as success
                // We need to revert the penalties applied in the previous _scoreRound call
                const lastResult = state.roundResults[state.roundResults.length - 1];
                let score = state.score + 1;
                let cardsLost = state.cardsLost - (lastResult.extraCardLost ? 2 : 1);

                const updatedRoundResults = [...state.roundResults];
                updatedRoundResults[updatedRoundResults.length - 1] = {
                    ...lastResult,
                    result: 'success',
                    extraCardLost: false,
                    manualValidation: true,
                };

                return {
                    ...state,
                    score,
                    cardsLost,
                    result: 'success',
                    roundResults: updatedRoundResults,
                    message: `💎 Validé manuellement par l'hôte ! Le mot "${state.secretWord}" est accepté.`,
                };
            }

            // ── Phase 6: Move to next round ──────────────────────
            case 'NEXT_ROUND': {
                if (state.phase !== 'scoring') return state;
                return this._nextRound(state);
            }

            default:
                return state;
        }
    }

    // ─── Disconnect Handling ──────────────────────────────────
    handleDisconnect(playerId, state, room) {
        if (!state || state.phase === 'game_over') return null;

        const guesser = state.players[state.guesserIndex];

        // If the active guesser disconnects, we should ideally auto-pass their turn.
        // We can do this safely if they are in a phase where they are blocking.
        if (playerId === guesser.id) {
            if (state.phase === 'number_selection') {
                // Auto-pick a random number (1-5) to keep the game moving, or just auto-pass.
                // Let's auto-pass the round.
                return this._scoreRound({ ...state, guess: null, result: 'pass' });
            }
            if (state.phase === 'guessing') {
                // Auto-pass
                return this._scoreRound({ ...state, guess: null, result: 'pass' });
            }
        } else {
            // A clue-giver disconnected
            if (state.phase === 'clue_giving') {
                // Check if we were only waiting for this person.
                const nonGuessers = state.players.filter(p => p.id !== guesser.id && p.online !== false);
                const allSubmitted = nonGuessers.every(p => state.clues[p.id]);

                if (allSubmitted && nonGuessers.length > 0) {
                    return this._resolveClues(state);
                }
            }
        }
        return null; // State unchanged
    }

    // ─── Internal Helpers ─────────────────────────────────────

    /** Compare all submitted clues and mark duplicates as invalid. */
    _resolveClues(state) {
        const guesser = state.players[state.guesserIndex];
        const submissions = Object.entries(state.clues)
            .filter(([pid]) => pid !== guesser.id)
            .map(([playerId, { word }]) => ({ playerId, word }));

        const invalidIds = findInvalidClues(submissions);

        const resolvedClues = {};
        for (const [pid, clue] of Object.entries(state.clues)) {
            resolvedClues[pid] = {
                ...clue,
                valid: !invalidIds.has(pid),
            };
        }

        // If ALL clues are invalid, skip straight to scoring (auto-fail)
        const validCount = Object.values(resolvedClues).filter(c => c.valid).length;

        if (validCount === 0) {
            return this._scoreRound({
                ...state,
                clues: resolvedClues,
                phase: 'guessing',
                guess: null,
                result: 'fail',
                message: 'Tous les indices ont été annulés !',
            });
        }

        return {
            ...state,
            phase: 'guessing',
            clues: resolvedClues,
            message: `${invalidIds.size} indice(s) éliminé(s). Au devineur de jouer !`,
        };
    }

    /** Apply scoring rules and transition to scoring phase. */
    _scoreRound(state) {
        let score = state.score;
        let cardsLost = state.cardsLost;
        let extraCardLost = false;

        if (state.result === 'success') {
            score += 1;
        } else if (state.result === 'fail') {
            // Wrong answer: lose current card + next card
            cardsLost += 2;
            extraCardLost = true;
        } else if (state.result === 'pass') {
            // Pass: lose just this card
            cardsLost += 1;
        }

        const roundResult = {
            round: state.round,
            secretWord: state.secretWord,
            guess: state.guess,
            result: state.result,
            clues: state.clues,
            extraCardLost,
        };

        return {
            ...state,
            phase: 'scoring',
            score,
            cardsLost,
            roundResults: [...state.roundResults, roundResult],
            message: state.result === 'success'
                ? `✅ Bravo ! "${state.secretWord}" trouvé !`
                : state.result === 'pass'
                    ? `⏭️ Passé. Le mot était "${state.secretWord}".`
                    : `❌ Raté. Le mot était "${state.secretWord}".`,
        };
    }

    /** Advance to the next round or end the game. */
    _nextRound(state) {
        const lastResult = state.roundResults[state.roundResults.length - 1];
        // Cards consumed: current card + possibly extra lost card
        const cardsConsumed = lastResult.extraCardLost ? 2 : 1;
        const nextCardIndex = state.currentCardIndex + cardsConsumed;

        // Next guesser in rotation
        const nextGuesserIndex = (state.guesserIndex + 1) % state.players.length;
        const nextRound = state.round + 1;

        if (nextCardIndex >= state.deck.length || nextRound > state.totalRounds) {
            return {
                ...state,
                phase: 'game_over',
                currentCardIndex: nextCardIndex,
                guesserIndex: nextGuesserIndex,
                round: nextRound,
                message: this._getFinalMessage(state.score),
            };
        }

        return {
            ...state,
            phase: 'number_selection',
            currentCardIndex: nextCardIndex,
            chosenNumber: null,
            secretWord: null,
            clues: {},
            guess: null,
            result: null,
            guesserIndex: nextGuesserIndex,
            round: nextRound,
            message: null,
        };
    }

    /** Return the congratulatory message based on score. */
    _getFinalMessage(score) {
        if (score === 13) return '🌟 Score parfait ! Y arriverez-vous encore ?';
        if (score === 12) return '🎉 Incroyable ! Vos amis doivent être impressionnés !';
        if (score === 11) return '🎊 Génial ! C\'est un score qui se fête !';
        if (score >= 9) return '👍 Waouh, pas mal du tout !';
        if (score >= 7) return '😐 Vous êtes dans la moyenne. Arriverez-vous à faire mieux ?';
        if (score >= 4) return '🙂 C\'est un bon début. Réessayez !';
        return '😅 Essayez encore !';
    }

    isGameOver(state) {
        return state.phase === 'game_over';
    }

    getResults(state) {
        return {
            score: state.score,
            total: state.totalRounds,
            roundResults: state.roundResults,
            message: state.message,
        };
    }
}
