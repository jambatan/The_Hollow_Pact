import { Entity } from './Entity.js';

export class RemotePlayer extends Entity {
  constructor(id, x, y) {
    super(x, y, 12, 12);
    this.tags.add('player');
    this.tags.add('remote_player');
    this.id     = id;
    this.name   = `Player ${id}`;
    this.isLocal = false;

    // Interpolation targets
    this._netX = x;
    this._netY = y;
    this._lerp = 0.2;

    this.stats = {
      current: { HP: 50 }, derived: { HP: 50 }
    };
    this._walkFrame = 0;
    this._walkAnimTime = 0;
  }

  applySnapshot(snap) {
    // Target world position from center coord
    this._netX = snap.x - this.w / 2;
    this._netY = snap.y - this.h / 2;
    if (snap.hp   != null) this.stats.current.HP = snap.hp;
    if (snap.maxHp!= null) this.stats.derived.HP = snap.maxHp;
    if (snap.facing)    this.facing    = snap.facing;
    if (snap.animState) this.animState = snap.animState;
    this.name = snap.charName ?? this._charName ?? `P${snap.id}`;
  }

  update(dt) {
    // Interpolate toward network position
    this.x += (this._netX - this.x) * Math.min(1, this._lerp * 60 * dt);
    this.y += (this._netY - this.y) * Math.min(1, this._lerp * 60 * dt);

    if (this.animState === 'walk') {
      this._walkAnimTime += dt;
      if (this._walkAnimTime > 0.15) { this._walkAnimTime = 0; this._walkFrame = (this._walkFrame + 1) % 4; }
    }
  }

  draw(ctx, camera, assets) {
    const { x, y, w, h } = this;
    const bob = this.animState === 'walk' ? Math.sin(this._walkFrame * Math.PI / 2) * 1 : 0;

    // Different tint for remote players
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h + 1, w/2 - 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8855';
    ctx.fillRect(x + 2, y + 4 + bob, w - 4, h - 4);
    ctx.fillStyle = '#f0c080';
    ctx.fillRect(x + 3, y + bob, w - 6, 6);

    // Name
    ctx.fillStyle = '#ff8855';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, x + w / 2, y - 3);
    ctx.textAlign = 'left';

    // HP bar
    const pct = this.stats.current.HP / this.stats.derived.HP;
    ctx.fillStyle = '#400'; ctx.fillRect(x - 1, y - 5, w + 2, 2);
    ctx.fillStyle = '#0c0'; ctx.fillRect(x - 1, y - 5, Math.ceil((w + 2) * pct), 2);
  }
}
