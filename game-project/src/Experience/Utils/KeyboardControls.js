export default class KeyboardControls {
    constructor(targetEl = window) {
        this.pressed = new Set();

        // Evita scroll con flechas/espacio mientras juegas
        const block = (e) => {
            const codes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
            if (codes.includes(e.code)) {
                e.preventDefault();
            }
        };

        targetEl.addEventListener('keydown', (e) => {
            this.pressed.add(e.code);
            block(e);
        }, {
            passive: false
        });

        targetEl.addEventListener('keyup', (e) => {
            this.pressed.delete(e.code);
            block(e);
        }, {
            passive: false
        });
    }

    getState() {
        const p = this.pressed;
        return {
            // WASD
            w: p.has('KeyW'),
            a: p.has('KeyA'),
            s: p.has('KeyS'),
            d: p.has('KeyD'),
            // Flechas
            up: p.has('ArrowUp'),
            down: p.has('ArrowDown'),
            left: p.has('ArrowLeft'),
            right: p.has('ArrowRight'),
            // Otros
            space: p.has('Space'),
            shift: p.has('ShiftLeft') || p.has('ShiftRight'),
        };
    }
}