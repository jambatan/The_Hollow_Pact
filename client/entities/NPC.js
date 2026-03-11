import { Entity } from './Entity.js';

const NPC_COLORS = {
  guard:    { body: '#446688', head: '#f0c080' },
  innkeeper:{ body: '#884422', head: '#f0c080' },
  blacksmith:{ body: '#444444', head: '#c07040' },
  merchant: { body: '#228844', head: '#f0c080' },
  scholar:  { body: '#664488', head: '#f0e0c0' },
  farmer:   { body: '#886622', head: '#d09060' },
  healer:   { body: '#228888', head: '#f0c080' },
  mage:     { body: '#442288', head: '#d0c0ff' },
  ranger:   { body: '#446622', head: '#d09060' },
  default:  { body: '#888844', head: '#f0c080' },
};

export class NPC extends Entity {
  constructor(def, x, y) {
    super(x, y, 12, 12);
    this.tags.add('npc');
    this.id          = def.id;
    this.name        = def.name ?? def.id;
    this.sprite      = def.sprite ?? 'default';
    // charSprite: { base: tileIdx, layers: [tileIdx, ...] } composite char sheet sprite
    this.charSprite = def.charSprite ?? (def.charSheetIdx != null ? { base: def.charSheetIdx, layers: [] } : null);
    this.dialogueTree = def.dialogueTree ?? null;
    this.questGiver  = def.questGiver ?? [];
    this.shopId      = def.shopId ?? null;
    this.schedule    = def.schedule ?? [];

    // Current schedule state
    this.currentState = 'idle';
    this._targetX = x;
    this._targetY = y;

    this._walkAnimTime = 0;
    this._walkFrame = 0;
    this._idleTimer  = 0;
  }

  update(dt) {
    if (this.skillBook) this.skillBook.update(dt);
    const dx = this._targetX - this.x;
    const dy = this._targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3 && this.currentState !== 'sleep') {
      // Followers match player speed (base ~55) so they don't fall behind
      const spd = this._followPlayer ? (this._followSpeed ?? 65) : 25;
      this.vx = (dx / dist) * spd;
      this.vy = (dy / dist) * spd;
      this.animState = 'walk';
      this._walkAnimTime += dt;
      if (this._walkAnimTime > 0.2) { this._walkAnimTime = 0; this._walkFrame = (this._walkFrame + 1) % 4; }
      // Facing
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
    } else {
      this.vx = 0;
      this.vy = 0;
      this.animState = 'idle';
      this._walkFrame = 0;
    }
  }

  setScheduleTarget(x, y, state) {
    this._targetX = x;
    this._targetY = y;
    this.currentState = state;
  }

  draw(ctx, camera, assets) {
    const { x, y, w, h } = this;
    const bob = this.animState === 'walk' ? Math.sin(this._walkFrame * Math.PI / 2) * 0.8 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
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
      if (this.currentState === 'sleep') {
        ctx.save(); ctx.globalAlpha = 0.6;
        assets.drawTile(ctx, 'chars', this.charSprite.base, x, y + h - 8, w, 8);
        ctx.restore();
      } else {
        drawLayer(this.charSprite.base, false);
        (this.charSprite.layers ?? []).forEach(l => {
          const norm = typeof l === 'number' ? { idx: l, mirror: false } : l;
          drawLayer(norm.idx, norm.mirror);
        });
      }
      return;
    }

    const colors = NPC_COLORS[this.sprite] ?? NPC_COLORS.default;

    if (this.currentState === 'sleep') {
      // Sleeping: flat horizontal shape
      ctx.fillStyle = colors.body;
      ctx.fillRect(x, y + h - 4, w, 4);
      ctx.fillStyle = colors.head;
      ctx.fillRect(x, y + h - 4, 5, 4);
      // 'Z' indicator
      ctx.fillStyle = '#aaaaff';
      ctx.font = '5px monospace';
      ctx.fillText('z', x + w + 1, y + h - 2);
      return;
    }

    // Body
    ctx.fillStyle = colors.body;
    ctx.fillRect(x + 2, y + 4 + bob, w - 4, h - 4);
    // Head
    ctx.fillStyle = colors.head;
    ctx.fillRect(x + 3, y + bob, w - 6, 6);

    // Quest indicator (! above head)
    // Will be populated by QuestSystem once quests are tracked

    // Interaction indicator (E key prompt drawn by DialogueSystem/UIManager)
  }

  // Returns true if player is close enough to interact
  canInteract(player) {
    return this.distanceTo(player) < 24;
  }
}
