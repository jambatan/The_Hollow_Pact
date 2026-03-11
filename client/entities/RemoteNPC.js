import { Entity } from './Entity.js';

// Ghost entity representing another player's NPC party member.
// Receives position/HP updates from the network; interpolates smoothly.
export class RemoteNPC extends Entity {
  constructor(ownerId, npcId, x, y) {
    super(x, y, 12, 12);
    this.tags.add('remote_npc');
    this.ownerId = ownerId; // network ID of the player who owns this NPC
    this.npcId   = npcId;  // e.g. 'party_healer'
    this.name    = npcId;

    this._netX = x;
    this._netY = y;
    this._lerp = 0.2;

    this.stats = { current: { HP: 30 }, derived: { HP: 30 } };
    this._walkFrame = 0;
    this._walkAnimTime = 0;
  }

  applySnap(snap) {
    this._netX = snap.x - this.w / 2;
    this._netY = snap.y - this.h / 2;
    if (snap.name)         this.name               = snap.name;
    if (snap.hp    != null) this.stats.current.HP   = snap.hp;
    if (snap.maxHp != null) this.stats.derived.HP   = snap.maxHp;
    if (snap.facing)       this.facing              = snap.facing;
    if (snap.animState)    this.animState           = snap.animState;
  }

  update(dt) {
    this.x += (this._netX - this.x) * Math.min(1, this._lerp * 60 * dt);
    this.y += (this._netY - this.y) * Math.min(1, this._lerp * 60 * dt);
    if (this.animState === 'walk') {
      this._walkAnimTime += dt;
      if (this._walkAnimTime > 0.15) { this._walkAnimTime = 0; this._walkFrame = (this._walkFrame + 1) % 4; }
    }
  }

  draw(ctx) {
    const { x, y, w, h } = this;
    const bob = this.animState === 'walk' ? Math.sin(this._walkFrame * Math.PI / 2) * 1 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 1, w / 2 - 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (teal tint to distinguish from local party NPCs)
    ctx.fillStyle = '#44bbaa';
    ctx.fillRect(x + 2, y + 4 + bob, w - 4, h - 4);
    ctx.fillStyle = '#f0c080';
    ctx.fillRect(x + 3, y + bob, w - 6, 6);

    // Name
    ctx.fillStyle = '#88ffee';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, x + w / 2, y - 3);
    ctx.textAlign = 'left';

    // HP bar
    const pct = this.stats.current.HP / Math.max(1, this.stats.derived.HP);
    ctx.fillStyle = '#400'; ctx.fillRect(x - 1, y - 8, w + 2, 2);
    ctx.fillStyle = '#0c0'; ctx.fillRect(x - 1, y - 8, Math.ceil((w + 2) * pct), 2);
  }
}
