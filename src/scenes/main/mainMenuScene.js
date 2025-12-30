// mainMenuScene.js - Main title scene before game start

export class MainMenuScene {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
    }

    enter() {}

    exit() {}

    update() {}

    render(ctx) {
        ctx.fillStyle = '#070707';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const g = ctx.createRadialGradient(
            this.canvas.width * 0.5,
            this.canvas.height * 0.45,
            10,
            this.canvas.width * 0.5,
            this.canvas.height * 0.5,
            Math.max(this.canvas.width, this.canvas.height) * 0.7
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
