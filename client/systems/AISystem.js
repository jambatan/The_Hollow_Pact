import { EVENTS } from '../../shared/constants.js';

// Formation slots: [back, lateral] offsets in player-forward/perpendicular space
const FORMATION = [
  [24,  0 ],   // slot 0: directly behind
  [32, -18],   // slot 1: behind-left
  [32,  18],   // slot 2: behind-right
  [46,  0 ],   // slot 3: further behind
];

export class AISystem {
  constructor(events) {
    this.events = events;
  }

  update(dt, zone, players) {
    const enemies = zone.getEntitiesWithTag('enemy');
    const activePlayers = players.filter(p => p.active && !p.stats.isDead);

    // ── Follower formation ────────────────────────────────────────────────────
    const localPlayer = activePlayers.find(p => p.isLocal) ?? players.find(p => p.isLocal);
    if (localPlayer) {
      const pvLen = Math.sqrt(localPlayer.vx ** 2 + localPlayer.vy ** 2);
      if (pvLen > 2) {
        localPlayer._lastFwdX = localPlayer.vx / pvLen;
        localPlayer._lastFwdY = localPlayer.vy / pvLen;
      }
      const fwdX = localPlayer._lastFwdX ?? 0;
      const fwdY = localPlayer._lastFwdY ?? 1;
      const perpX = -fwdY, perpY = fwdX;

      const followers = zone.entities.filter(e => e._followPlayer && e.active);
      followers.forEach((e, i) => {
        const [back, lateral] = FORMATION[Math.min(i, FORMATION.length - 1)];
        const tx = localPlayer.cx - fwdX * back + perpX * lateral;
        const ty = localPlayer.cy - fwdY * back + perpY * lateral;
        const dx = tx - e.cx, dy = ty - e.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 20) {
          const movedX = Math.abs(e.x - (e._prevX ?? e.x));
          const movedY = Math.abs(e.y - (e._prevY ?? e.y));
          if (movedX + movedY < 1) {
            e._stuckTimer = (e._stuckTimer ?? 0) + dt;
            if (e._stuckTimer > 0.8) {
              const angle = Math.random() * Math.PI * 2;
              e._targetX = localPlayer.cx - e.w / 2 + Math.cos(angle) * 16;
              e._targetY = localPlayer.cy - e.h / 2 + Math.sin(angle) * 16;
              e._stuckTimer = 0;
              e._wanderTargetX = null; e._wanderTargetY = null;
            }
          } else { e._stuckTimer = 0; }
        } else { e._stuckTimer = 0; }
        e._prevX = e.x; e._prevY = e.y;

        if (dist > 6) {
          e._targetX = tx - e.w / 2; e._targetY = ty - e.h / 2;
          e._wanderTargetX = null; e._wanderTargetY = null;
        } else {
          e._wanderTimer = (e._wanderTimer ?? 0) - dt;
          if (e._wanderTimer <= 0) {
            e._wanderTimer = 2 + Math.random() * 3;
            const angle = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
            e._wanderTargetX = tx + Math.cos(angle) * r - e.w / 2;
            e._wanderTargetY = ty + Math.sin(angle) * r - e.h / 2;
          }
          if (e._wanderTargetX != null) { e._targetX = e._wanderTargetX; e._targetY = e._wanderTargetY; }
        }
      });
    }

    // ── Enemy AI ──────────────────────────────────────────────────────────────
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      switch (enemy.aiType) {
        case 'idle':   this._idleAI(enemy, dt); break;
        case 'patrol': this._patrolAI(enemy, dt, activePlayers, zone); break;
        case 'chase':  this._chaseAI(enemy, dt, activePlayers); break;
        default:       this._patrolAI(enemy, dt, activePlayers, zone);
      }
    }

    // ── NPC fight-or-flight ───────────────────────────────────────────────────
    const npcs = zone.getEntitiesWithTag('npc');
    for (const npc of npcs) {
      if (!npc.active || npc._followPlayer) continue;
      const behavior = npc._combatBehavior;
      if (!behavior || behavior === 'neutral') continue;

      if (behavior === 'guard' && npc.stats) {
        const guardRange = npc._guardRange ?? 150;
        const nearEnemy = enemies.find(e => e.active && npc.distanceTo(e) < guardRange);
        if (nearEnemy) {
          const dx = nearEnemy.cx - npc.cx, dy = nearEnemy.cy - npc.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const atkRange = npc._attackRange ?? 18;
          if (dist > atkRange) {
            const spd = npc.stats.derived?.SPD ?? 55;
            npc.vx = (dx / dist) * spd; npc.vy = (dy / dist) * spd;
          } else {
            npc.vx = 0; npc.vy = 0;
            npc._guardAtkTimer = (npc._guardAtkTimer ?? 0) - dt;
            if (npc._guardAtkTimer <= 0) {
              npc._guardAtkTimer = 1.5;
              const atk = npc.stats.derived?.ATK ?? 12;
              const dmg = atk + Math.floor(Math.random() * 5);
              nearEnemy.stats?.takeDamage(dmg);
              if (nearEnemy.stats?.isDead) {
                nearEnemy.active = false;
                this.events?.emit(EVENTS.ENTITY_DIED, { entity: nearEnemy, killer: npc });
              }
            }
          }
        } else {
          npc.vx = 0; npc.vy = 0;
        }

      } else if (behavior === 'coward') {
        const fleeRange = npc._fleeRange ?? 120;
        const nearEnemy = enemies.find(e => e.active && npc.distanceTo(e) < fleeRange);
        if (nearEnemy) {
          const dx = npc.cx - nearEnemy.cx, dy = npc.cy - nearEnemy.cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const spd = (npc.stats?.derived?.SPD ?? 40) * 1.3;
          npc.vx = (dx / dist) * spd; npc.vy = (dy / dist) * spd;
        } else {
          npc.vx *= 0.8; npc.vy *= 0.8;
          if (Math.abs(npc.vx) + Math.abs(npc.vy) < 1) { npc.vx = 0; npc.vy = 0; }
        }
      }
    }
  }

  _idleAI(enemy, dt) {
    this._wanderInRect(enemy, dt);
  }

  _patrolAI(enemy, dt, players, zone) {
    const target = this._findTarget(enemy, players);
    if (target) {
      enemy._target = target;
      enemy.aiState = 'chase';
      this._chaseTarget(enemy, target);
      return;
    }

    // No patrol points → wander within spawn rect
    if (!enemy.patrolPoints || enemy.patrolPoints.length === 0) {
      this._wanderInRect(enemy, dt);
      return;
    }

    const pt = enemy.patrolPoints[enemy.patrolIndex];
    const dx = pt.x - enemy.cx, dy = pt.y - enemy.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
      enemy.vx = 0; enemy.vy = 0;
    } else {
      const spd = (enemy.stats?.derived?.SPD ?? 40) * 0.5;
      enemy.vx = (dx / dist) * spd; enemy.vy = (dy / dist) * spd;
    }
  }

  _chaseAI(enemy, dt, players) {
    const target = this._findTarget(enemy, players);
    if (!target) {
      enemy._target = null;
      enemy.aiState = 'patrol';
      enemy.vx = 0; enemy.vy = 0;
      return;
    }
    enemy._target = target;
    this._chaseTarget(enemy, target);
  }

  _chaseTarget(enemy, target) {
    const dx = target.cx - enemy.cx, dy = target.cy - enemy.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < (enemy._attackRange ?? 16)) {
      enemy.vx = 0; enemy.vy = 0;
    } else {
      const spd = enemy.stats?.derived?.SPD ?? 40;
      enemy.vx = (dx / dist) * spd; enemy.vy = (dy / dist) * spd;
    }
  }

  // Wander randomly within _spawnRect (or near current position if no rect)
  _wanderInRect(enemy, dt) {
    enemy._wanderTimer = (enemy._wanderTimer ?? 0) - dt;
    if (enemy._wanderTimer <= 0 || enemy._wanderTargetX == null) {
      enemy._wanderTimer = 2 + Math.random() * 4;
      if (enemy._spawnRect) {
        const r = enemy._spawnRect;
        enemy._wanderTargetX = r.x + 8 + Math.random() * Math.max(0, r.w - 16);
        enemy._wanderTargetY = r.y + 8 + Math.random() * Math.max(0, r.h - 16);
      } else {
        const angle = Math.random() * Math.PI * 2;
        const rad = 16 + Math.random() * 32;
        enemy._wanderTargetX = enemy.cx + Math.cos(angle) * rad;
        enemy._wanderTargetY = enemy.cy + Math.sin(angle) * rad;
      }
    }
    const dx = enemy._wanderTargetX - enemy.cx;
    const dy = enemy._wanderTargetY - enemy.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 6) {
      enemy.vx = 0; enemy.vy = 0;
      enemy._wanderTimer = 0;
    } else {
      const spd = (enemy.stats?.derived?.SPD ?? 40) * 0.35;
      enemy.vx = (dx / dist) * spd; enemy.vy = (dy / dist) * spd;
    }
  }

  _findTarget(enemy, players) {
    const range = enemy._aggroRange ?? 80;
    let closest = null, closestDist = range;
    for (const p of players) {
      const d = enemy.distanceTo(p);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    return closest;
  }
}
