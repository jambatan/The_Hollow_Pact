export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, buttons: new Set() };
    this._pendingPress = new Set();
    this._pendingRelease = new Set();
    this._bind();
  }

  _bind() {
    const PREVENT_DEFAULT = new Set([
      'Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace',
    ]);
    window.addEventListener('keydown', e => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this._pendingPress.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      this._pendingRelease.add(e.code);
    });
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / r.width;
      const scaleY = this.canvas.height / r.height;
      this.mouse.x = (e.clientX - r.left) * scaleX;
      this.mouse.y = (e.clientY - r.top) * scaleY;
    });
    this.canvas.addEventListener('mousedown', e => this.mouse.buttons.add(e.button));
    this.canvas.addEventListener('mouseup', e => this.mouse.buttons.delete(e.button));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Call once per frame before systems run
  flush() {
    this.justPressed = new Set(this._pendingPress);
    this.justReleased = new Set(this._pendingRelease);
    this._pendingPress.clear();
    this._pendingRelease.clear();
  }

  isDown(code) { return this.keys.has(code); }
  pressed(code) { return this.justPressed.has(code); }
  released(code) { return this.justReleased.has(code); }

  // Axis helpers
  axisX() {
    return (this.isDown('ArrowRight') || this.isDown('KeyD') ? 1 : 0)
         - (this.isDown('ArrowLeft')  || this.isDown('KeyA') ? 1 : 0);
  }
  axisY() {
    return (this.isDown('ArrowDown')  || this.isDown('KeyS') ? 1 : 0)
         - (this.isDown('ArrowUp')    || this.isDown('KeyW') ? 1 : 0);
  }
}
