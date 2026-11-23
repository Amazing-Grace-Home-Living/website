// GameEngine module – core loop and game state management

export interface GameEngineOptions {
  /** Desired frames per second; defaults to 60 */
  fps?: number;
  /** Callback invoked each frame with a timestamp (ms) */
  tick: (deltaTime: number) => void;
}

export class GameEngine {
  private fps: number;
  private tick: (delta: number) => void;
  private lastTime: number = 0;
  private rafId: number | null = null;
  private frameDuration: number;

  constructor(options: GameEngineOptions) {
    this.fps = options.fps ?? 60;
    this.tick = options.tick;
    this.frameDuration = 1000 / this.fps;
  }

  /** Start the render / update loop */
  start() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const delta = now - this.lastTime;
      if (delta >= this.frameDuration) {
        this.tick(delta);
        this.lastTime = now;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Stop the loop */
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
