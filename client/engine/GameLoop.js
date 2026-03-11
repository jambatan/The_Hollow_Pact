import { FIXED_DT } from '../../shared/constants.js';

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.update = updateFn;
    this.render = renderFn;
    this._running = false;
    this._accumulator = 0;
    this._lastTime = 0;
    this._rafId = null;
  }

  start() {
    this._running = true;
    this._lastTime = performance.now();
    this._tick(this._lastTime);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  _tick(now) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(t => this._tick(t));

    let dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    // Cap dt to avoid spiral of death on tab blur
    if (dt > 0.1) dt = 0.1;

    this._accumulator += dt;
    while (this._accumulator >= FIXED_DT) {
      this.update(FIXED_DT);
      this._accumulator -= FIXED_DT;
    }

    this.render(this._accumulator / FIXED_DT);
  }
}
