import { GameClient } from '@myrtille/engine';

/**
 * Blindtest — Client
 *
 * Music quiz with buzzer: listen to audio snippets and be the first
 * to identify the song/artist.
 */
export class BlindtestClient extends GameClient {
    static id = 'blindtest';
    static displayName = 'Blindtest';
    static description = 'Quiz musical avec buzzer — soyez le plus rapide !';
    static minPlayers = 2;
    static maxPlayers = 20;
    static icon = 'icon.svg';

    mount(container, context) {
        this.container = container;
        this.context = context;

        container.innerHTML = `
      <div class="bt-game">
        <h2>🎵 Blindtest</h2>
        <button class="bt-buzzer" id="bt-buzzer">BUZZ!</button>
        <p class="bt-waiting">En attente du lancement...</p>
      </div>
    `;

        // Wire up buzzer
        const buzzer = container.querySelector('#bt-buzzer');
        buzzer.addEventListener('click', () => {
            context.socket.emit('game:action', {
                type: 'BUZZ',
                payload: { timestamp: Date.now() },
            });
        });
    }

    onStateUpdate(state) {
        // TODO: Implement rendering (audio player, scores, etc.)
        console.log('[Blindtest] State update:', state);
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
