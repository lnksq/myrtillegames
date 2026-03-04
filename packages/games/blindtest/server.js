import { GameServer } from '@myrtille/engine';

/**
 * Blindtest — Server
 *
 * Handles track selection, buzzer timing, answer validation, scoring.
 */
export class BlindtestServer extends GameServer {
    static id = 'blindtest';

    initialize(room) {
        return {
            round: 1,
            totalRounds: 20,
            phase: 'waiting',          // waiting → playing → buzzer_locked → answer → scoring
            currentTrack: null,        // { title, artist, previewUrl }
            buzzerQueue: [],           // [{ playerId, timestamp }]
            scores: {},
            tracks: [],                // TODO: load from playlist
        };
    }

    handleAction(action, state) {
        switch (action.type) {
            case 'BUZZ':
                return {
                    ...state,
                    buzzerQueue: [
                        ...state.buzzerQueue,
                        { playerId: action.playerId, timestamp: action.payload.timestamp },
                    ],
                };

            case 'ANSWER':
                // TODO: validate answer, award points
                return state;

            case 'NEXT_ROUND':
                return {
                    ...state,
                    round: state.round + 1,
                    phase: 'playing',
                    buzzerQueue: [],
                };

            default:
                return state;
        }
    }

    isGameOver(state) {
        return state.round > state.totalRounds;
    }

    getResults(state) {
        return { scores: state.scores };
    }
}
