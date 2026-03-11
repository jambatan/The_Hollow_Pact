import { EVENTS, CANVAS_W } from '../../shared/constants.js';

export class NotificationSystem {
  constructor(events) {
    this._notes = []; // { text, color, x, y, life, maxLife }
    events.on(EVENTS.NOTIFICATION, this._add.bind(this));
  }

  _add({ text, color, x, y }) {
    this._notes.push({
      text, color: color ?? '#fff',
      // If world coords provided they'll be converted in render; otherwise float above center
      worldX: x ?? null, worldY: y ?? null,
      // Screen-positioned floating notes (no world coords)
      screenX: x == null ? CANVAS_W / 2 : null,
      screenY: x == null ? 80 : null,
      life: 1.5, maxLife: 1.5,
      dy: -20, // pixels to drift upward total
    });
    // Cap at 8 simultaneous notes
    if (this._notes.length > 8) this._notes.shift();
  }

  update(dt) {
    for (const n of this._notes) n.life -= dt;
    // Remove expired
    for (let i = this._notes.length - 1; i >= 0; i--) {
      if (this._notes[i].life <= 0) this._notes.splice(i, 1);
    }
  }

  render(ctx, camera) {
    for (const n of this._notes) {
      const alpha = Math.min(1, n.life / n.maxLife * 2);
      const progress = 1 - n.life / n.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = n.color;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';

      let sx, sy;
      if (n.screenX != null) {
        sx = n.screenX;
        sy = n.screenY - progress * 20;
      } else if (camera && n.worldX != null) {
        // Convert world to screen
        sx = (n.worldX - camera.x) * camera.zoom;
        sy = (n.worldY - camera.y) * camera.zoom - progress * 20;
      } else {
        sx = CANVAS_W / 2;
        sy = 80 - progress * 20;
      }

      ctx.fillText(n.text, sx, sy);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }
}
