import { Entity } from './Entity.js';
import { StatBlock } from '../stats/StatBlock.js';

const ENEMY_COLORS = {
  skeleton: { body: '#ddddcc', accent: '#aaaa99' },
  zombie:   { body: '#668866', accent: '#446644' },
  goblin:   { body: '#448844', accent: '#336633' },
  bandit:   { body: '#664422', accent: '#553311' },
  slime:    { body: '#44aa44', accent: '#339933' },
  spider:   { body: '#222222', accent: '#111111' },
  mire_crawler: { body: '#446644', accent: '#335533' },
  default:  { body: '#cc2222', accent: '#881111' },
};

export class Enemy extends Entity {
  constructor(def, x, y) {
    super(x, y, 12, 12);
    this.tags.add('enemy');
    this.defId       = def.id;
    this.name        = def.name ?? def.id;
    this.sprite      = def.sprite ?? 'default';
    // charSprite: { base: tileIdx, layers: [tileIdx, ...] } composite char sheet sprite
    this.charSprite = def.charSprite ?? (def.charSheetIdx != null ? { base: def.charSheetIdx, layers: [] } : null);
    this.aiType      = def.aiType ?? 'patrol'; // idle, patrol, chase, ranged
    this.patrolPoints = [];
    this.patrolIndex  = 0;
    this.spawnDefId   = null;

    // Stats
    this.stats = new StatBlock(def.stats ?? {});
    this.stats.recalc();

    // Loot
    // Support array of loot table IDs; also accept legacy single lootTableId
    this.lootTableIds = def.lootTableIds ?? (def.lootTableId ? [def.lootTableId] : []);
    this.dropTable  = def.dropTable ?? [];
    this.goldRange  = def.goldRange ?? [0, 0];
    this.xpReward   = def.xpReward ?? 10;

    // AI state
    this.aiState    = 'patrol'; // patrol, chase, attack, flee
    this._aggroRange  = def.aggroRange  ?? 80;
    this._alertRadius = def.alertRadius ?? 60;   // triggers battle encounter
    this._engageRadius= def.engageRadius ?? 140; // secondary group-pull radius
    this._attackRange = def.attackRange ?? 16;
    this._attackSpeed     = def.attackSpeed ?? 1.5;
    this._attackCooldown  = this._attackSpeed * 0.5; // grace window on spawn/first encounter
    this._target          = null;
    this._playerHitFirst  = false; // set by CombatSystem when player attacks first

    this._walkAnimTime = 0;
    this._walkFrame = 0;
  }

  update(dt) {
    if (this._attackCooldown > 0) this._attackCooldown -= dt;
    if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
      this._walkAnimTime += dt;
      if (this._walkAnimTime > 0.15) { this._walkAnimTime = 0; this._walkFrame = (this._walkFrame + 1) % 4; }
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }
    if (Math.abs(this.vx) > Math.abs(this.vy)) this.facing = this.vx > 0 ? 'right' : 'left';
    else if (this.vy !== 0) this.facing = this.vy > 0 ? 'down' : 'up';
  }

  get isDead() { return this.stats.isDead; }

  draw(ctx, camera, assets) {
    const { x, y, w, h } = this;
    const bob = this.animState === 'walk' ? Math.sin(this._walkFrame * Math.PI / 2) * 0.8 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h + 1, w/2 - 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Char sheet sprite overrides canvas drawing
    if (this.charSprite?.base != null && assets?.hasTileset('chars')) {
      const drawLayer = (idx, mirror) => {
        if (mirror) {
          ctx.save(); ctx.translate(x + w, y + bob); ctx.scale(-1, 1);
          assets.drawTile(ctx, 'chars', idx, 0, 0, w, h);
          ctx.restore();
        } else {
          assets.drawTile(ctx, 'chars', idx, x, y + bob, w, h);
        }
      };
      drawLayer(this.charSprite.base, false);
      (this.charSprite.layers ?? []).forEach(l => {
        const norm = typeof l === 'number' ? { idx: l, mirror: false } : l;
        drawLayer(norm.idx, norm.mirror);
      });
    } else {
      const colors = ENEMY_COLORS[this.sprite] ?? ENEMY_COLORS.default;
      this._drawShape(ctx, x, y, w, h, bob, colors);
    }

    // HP bar
    const pct = this.stats.hp / this.stats.maxHp;
    const bx = x - 1, by = y - 5, bw = w + 2;
    ctx.fillStyle = '#300'; ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = pct > 0.5 ? '#0c0' : pct > 0.25 ? '#cc0' : '#c00';
    ctx.fillRect(bx, by, Math.ceil(bw * pct), 2);
  }

  _drawShape(ctx, x, y, w, h, bob, colors) {
    switch (this.sprite) {
      case 'skeleton':
        // White body with bone details
        ctx.fillStyle = colors.body; ctx.fillRect(x+3, y+4+bob, w-6, h-5);
        ctx.fillStyle = colors.body; ctx.fillRect(x+3, y+bob, w-6, 5); // skull
        ctx.fillStyle = '#111'; // eye sockets
        ctx.fillRect(x+4, y+1+bob, 2, 2); ctx.fillRect(x+w-6, y+1+bob, 2, 2);
        break;
      case 'zombie':
        ctx.fillStyle = colors.body; ctx.fillRect(x+2, y+4+bob, w-4, h-4);
        ctx.fillStyle = colors.body; ctx.fillRect(x+3, y+bob, w-6, 6);
        ctx.fillStyle = '#88ff88'; // glowing eyes
        ctx.fillRect(x+4, y+2+bob, 2, 2); ctx.fillRect(x+w-6, y+2+bob, 2, 2);
        break;
      case 'slime':
        ctx.fillStyle = colors.body;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2+bob+2, w/2, h/2-1, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = colors.accent;
        ctx.fillRect(x+4, y+h/2-1+bob, 2, 2); ctx.fillRect(x+w-6, y+h/2-1+bob, 2, 2);
        break;
      default:
        ctx.fillStyle = colors.body; ctx.fillRect(x+2, y+4+bob, w-4, h-4);
        ctx.fillStyle = colors.accent; ctx.fillRect(x+3, y+bob, w-6, 6);
        ctx.fillStyle = '#f00';
        ctx.fillRect(x+4, y+2+bob, 2, 2); ctx.fillRect(x+w-6, y+2+bob, 2, 2);
    }
  }
}
