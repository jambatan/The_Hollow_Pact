import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

export class Camera {
  constructor() {
    this.x = 0;        // world position of camera top-left
    this.y = 0;
    this.zoom = 2;     // pixel scale (2 = each game pixel is 2 screen pixels)
    this.viewW = CANVAS_W / this.zoom;
    this.viewH = CANVAS_H / this.zoom;
    this._targetX = 0;
    this._targetY = 0;
    this._lerp = 0.1;
  }

  follow(entity) {
    // Center camera on entity
    this._targetX = entity.cx - this.viewW / 2;
    this._targetY = entity.cy - this.viewH / 2;
  }

  update(dt, worldPixelW, worldPixelH) {
    // Smooth follow
    this.x += (this._targetX - this.x) * Math.min(1, this._lerp * 60 * dt);
    this.y += (this._targetY - this.y) * Math.min(1, this._lerp * 60 * dt);

    // Clamp to world bounds
    if (worldPixelW > 0) {
      this.x = Math.max(0, Math.min(this.x, worldPixelW - this.viewW));
      this.y = Math.max(0, Math.min(this.y, worldPixelH - this.viewH));
    }
  }

  applyTransform(ctx) {
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // Convert screen coords to world coords
  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  // Is a world rect visible?
  isVisible(wx, wy, ww, wh) {
    return wx + ww > this.x && wx < this.x + this.viewW
        && wy + wh > this.y && wy < this.y + this.viewH;
  }

  setZoom(z) {
    this.zoom = z;
    this.viewW = CANVAS_W / z;
    this.viewH = CANVAS_H / z;
  }
}
