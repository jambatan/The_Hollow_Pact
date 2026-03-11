let _nextId = 1;

export class Entity {
  constructor(x = 0, y = 0, w = 14, h = 14) {
    this.id     = _nextId++;
    this.x      = x;   // world pixel x (top-left)
    this.y      = y;   // world pixel y (top-left)
    this.w      = w;   // hitbox width
    this.h      = h;   // hitbox height
    this.vx     = 0;   // velocity x (pixels/sec)
    this.vy     = 0;   // velocity y
    this.tags   = new Set();
    this.active = true;
    this.visible = true;
    this.name   = '';
    this.facing = 'down'; // up/down/left/right
    this.animState = 'idle'; // idle/walk/attack
    this.animTimer = 0;
  }

  // Center coords
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // AABB collision helper
  overlaps(other) {
    return this.x < other.x + other.w && this.x + this.w > other.x
        && this.y < other.y + other.h && this.y + this.h > other.y;
  }

  overlapsRect(rx, ry, rw, rh) {
    return this.x < rx + rw && this.x + this.w > rx
        && this.y < ry + rh && this.y + this.h > ry;
  }

  distanceTo(other) {
    const dx = this.cx - other.cx, dy = this.cy - other.cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  update(dt) {}
  draw(ctx, camera, assets) {}
}
