import { Enemy } from '../entities/Enemy.js';
import { EVENTS } from '../../shared/constants.js';

export class SpawnSystem {
  constructor(events) {
    this.events = events;
    this._state = new Map();          // defId → { timer, slots[] }
    this._globalDefeated = new Map(); // defId → { killedAt, cooldown }

    events.on(EVENTS.ENTITY_DIED, ({ entity }) => {
      if (!entity.spawnDefId) return;
      const s = this._state.get(entity.spawnDefId);
      if (s) {
        s.timer = 0;
        const idx = s.slots.indexOf(entity);
        if (idx >= 0) s.slots[idx] = null;
      }
      // Track boss global defeats so they don't respawn on zone re-entry
      if (entity._isBoss) {
        this._globalDefeated.set(entity.spawnDefId, {
          killedAt: Date.now(),
          cooldown: entity._globalCooldown ?? 0,
        });
      }
    });
  }

  update(dt, zone, enemyDB) {
    for (const def of zone.spawnDefs) {
      if (!this._state.has(def.id)) {
        this._state.set(def.id, {
          timer: def.respawnTime ?? 30,
          slots: new Array(def.maxCount).fill(null),
        });
      }
      const state = this._state.get(def.id);

      const live = state.slots.filter(Boolean).length;
      if (live < def.maxCount) {
        state.timer += dt;
        if (state.timer >= (def.respawnTime ?? 30)) {
          state.timer = 0;
          this._spawn(def, zone, enemyDB, state);
        }
      } else {
        state.timer = 0;
      }
    }
    // Remove dead enemies from zone
    for (let i = zone.entities.length - 1; i >= 0; i--) {
      const e = zone.entities[i];
      if (e.tags?.has('enemy') && !e.active) zone.entities.splice(i, 1);
    }
  }

  _spawn(def, zone, enemyDB, state) {
    // Boss: check global defeat record
    if (def.isBoss) {
      const record = this._globalDefeated.get(def.id);
      if (record) {
        if (record.cooldown === 0) return; // never respawns this session
        const elapsed = (Date.now() - record.killedAt) / 1000;
        if (elapsed < record.cooldown) return; // still on cooldown
        this._globalDefeated.delete(def.id); // cooldown expired
      }
    }

    const slot = state.slots.findIndex(s => s == null);
    if (slot < 0) return; // no free slot (shouldn't happen given the live check)

    // Rare roll: chance to spawn rareId instead of enemyId
    let enemyId = def.enemyId;
    let isRare = false;
    if (def.rareId && (def.rareChance ?? 0) > 0 && Math.random() < def.rareChance) {
      enemyId = def.rareId;
      isRare = true;
    }

    const enemyDef = enemyDB[enemyId];
    if (!enemyDef) return;

    // Use seeded RNG so both clients get identical spawn positions for each slot
    const rng = this._slotRng(def.id, slot);
    const pos = this._pickPosSeeded(def, zone, rng);
    if (!pos) return;

    const enemy = new Enemy(enemyDef, pos.x, pos.y);
    enemy.spawnDefId    = def.id;
    enemy._netId        = `${def.id}:${slot}`;  // stable cross-client ID
    enemy.patrolPoints  = def.patrolPoints ?? [];
    enemy._spawnRect    = def.rect ? { ...def.rect } : null;
    enemy._isRare       = isRare;
    enemy._isBoss       = def.isBoss ?? false;
    enemy._globalCooldown = def.globalCooldown ?? 0;

    state.slots[slot] = enemy;
    zone.addEntity(enemy);
    this.events.emit(EVENTS.ENTITY_SPAWNED, { entity: enemy, isRare, isBoss: def.isBoss ?? false });
    if (isRare) this.events.emit(EVENTS.NOTIFICATION, { text: `A rare ${enemyDef.name} appears!`, color: '#f0b429', duration: 3 });
  }

  // Deterministic position using a seeded RNG — same seed → same position on every client
  _pickPosSeeded(def, zone, rng) {
    const ts = zone.tileMap.tileSize;
    if (def.spawnPoints?.length) {
      return def.spawnPoints[Math.floor(rng() * def.spawnPoints.length)];
    }
    for (let i = 0; i < 40; i++) {
      const wx = def.rect.x + rng() * def.rect.w;
      const wy = def.rect.y + rng() * def.rect.h;
      const tx = Math.floor(wx / ts);
      const ty = Math.floor(wy / ts);
      if (zone.tileMap.isWalkable(tx, ty) &&
          zone.tileMap.isWalkable(tx + 1, ty) &&
          zone.tileMap.isWalkable(tx, ty + 1)) {
        return { x: wx, y: wy };
      }
    }
    // Fallback: centre of rect
    return { x: def.rect.x + def.rect.w / 2, y: def.rect.y + def.rect.h / 2 };
  }

  // Simple seeded RNG (xorshift32)
  _slotRng(defId, slot) {
    let s = SpawnSystem._hashSeed(`${defId}:${slot}`);
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967295;
    };
  }

  static _hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0 || 1; // never 0 (xorshift would lock up)
  }
}
