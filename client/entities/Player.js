import { Entity } from './Entity.js';
import { EVENTS } from '../../shared/constants.js';

// Canvas drawing colors for player by facing
const PLAYER_COLORS = { body: '#5588ff', skin: '#f0c080', hair: '#402010' };

export class Player extends Entity {
  constructor(x, y, isLocal = true) {
    super(x, y, 12, 12);
    this.tags.add('player');
    this.isLocal = isLocal;
    this.name = 'Hero';

    // Stats (set up properly in Stage 2 with StatBlock)
    this.stats = {
      base:    { STR: 5, DEX: 5, INT: 3, CON: 5, WIS: 3, CHA: 3 },
      derived: { HP: 50, MP: 28, ATK: 12, DEF: 6, SPD: 80 },
      current: { HP: 50, MP: 28 },
    };

    this.level = 1;
    this.xp    = 0;
    this.gold  = 50;
    this.xpToNext = 100;

    // Placeholders — filled in Stage 4
    this.inventory = null;
    this.equipment = null;
    this.skillBook = null;

    // Network interpolation (for RemotePlayer)
    this._netX = x; this._netY = y;

    this._walkAnimTime = 0;
    this._walkFrame = 0;
    this._interactCooldown = 0;
  }

  gainXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(100 * Math.pow(this.level, 1.5));
      this._onLevelUp();
    }
  }

  _onLevelUp() {
    // Increase base stats and recalculate derived
    this.stats.base.CON += 1;
    this.stats.base.STR += 1;
    if (this.stats.recalc) {
      this.stats.recalc();
      this.stats.current.HP = this.stats.derived.HP; // full heal on level up
      this.stats.current.MP = this.stats.derived.MP;
    }
  }

  update(dt) {
    if (this._interactCooldown > 0) this._interactCooldown -= dt;
    if (this.skillBook) this.skillBook.update(dt);

    // Animate
    if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
      this.animState = 'walk';
      this._walkAnimTime += dt;
      if (this._walkAnimTime > 0.15) { this._walkAnimTime = 0; this._walkFrame = (this._walkFrame + 1) % 4; }
    } else {
      this.animState = 'idle';
      this._walkAnimTime = 0;
      this._walkFrame = 0;
    }

    // Facing
    if (Math.abs(this.vx) > Math.abs(this.vy)) {
      this.facing = this.vx > 0 ? 'right' : 'left';
    } else if (this.vy !== 0) {
      this.facing = this.vy > 0 ? 'down' : 'up';
    }
  }

  draw(ctx, camera, assets) {
    const { x, y, w, h } = this;
    const bob = this.animState === 'walk' ? Math.sin(this._walkFrame * Math.PI / 2) * 1 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h + 1, w/2 - 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = PLAYER_COLORS.body;
    ctx.fillRect(x + 2, y + 4 + bob, w - 4, h - 4);

    // Head
    ctx.fillStyle = PLAYER_COLORS.skin;
    ctx.fillRect(x + 3, y + bob, w - 6, 6);

    // Hair
    ctx.fillStyle = PLAYER_COLORS.hair;
    ctx.fillRect(x + 3, y + bob, w - 6, 2);

    // Eyes (facing-aware)
    ctx.fillStyle = '#222';
    if (this.facing === 'down') {
      ctx.fillRect(x + 4, y + 2 + bob, 2, 2);
      ctx.fillRect(x + w - 6, y + 2 + bob, 2, 2);
    } else if (this.facing === 'up') {
      // back of head - no eyes
    } else if (this.facing === 'right') {
      ctx.fillRect(x + w - 5, y + 2 + bob, 2, 2);
    } else {
      ctx.fillRect(x + 3, y + 2 + bob, 2, 2);
    }

    // HP bar above player
    const bw = w + 4, bx = x - 2, by = y - 6;
    const pct = this.stats.current.HP / this.stats.derived.HP;
    ctx.fillStyle = '#400'; ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#0c0'; ctx.fillRect(bx, by, Math.floor(bw * pct), 3);
  }

  toNetSnapshot() {
    return {
      id: this.id, x: this.cx, y: this.cy,
      facing: this.facing, animState: this.animState,
      hp: this.stats.current.HP, maxHp: this.stats.derived.HP,
    };
  }
}
