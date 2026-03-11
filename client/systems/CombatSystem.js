import { EVENTS } from '../../shared/constants.js';

export class CombatSystem {
  constructor(events) {
    this.events = events;
    this._hitFlash = new Map();
    this._inBattle = false;

    events.on(EVENTS.BATTLE_START, () => { this._inBattle = true; });
    events.on(EVENTS.BATTLE_END,   () => { this._inBattle = false; });
  }

  update(dt, zone, players, input) {
    // Real-time combat is paused during turn-based battles
    if (this._inBattle) return;

    // Player attacks
    for (const player of players) {
      if (!player.isLocal) continue;
      if (player.stats.isDead) continue;

      if (player._attackCooldown > 0) {
        player._attackCooldown -= dt;
        continue;
      }

      const attacking = input.pressed('Space') || input.pressed('KeyZ');
      if (!attacking) continue;

      player._attackCooldown = 1 / (player._attackSpeed ?? 1.2);
      player.animState = 'attack';

      // Hit enemies in range (player has longer reach than enemy melee range)
      for (const enemy of zone.getEntitiesWithTag('enemy')) {
        if (enemy.distanceTo(player) > 40) continue;
        this._applyHit(player, enemy, zone);
      }
    }

    // If battle was triggered during player attack loop, stop here
    if (this._inBattle) return;

    // Enemy attacks (only if not in battle — battle handles turns)
    for (const enemy of zone.getEntitiesWithTag('enemy')) {
      if (!enemy._target || !enemy._target.active) continue;
      const dist = enemy.distanceTo(enemy._target);
      const attackRange = (enemy._attackRange ?? 16) + 4;

      // Reset cooldown to a brief delay when enemy first enters attack range
      if (dist <= attackRange && !enemy._inAttackRange) {
        enemy._inAttackRange = true;
        if (enemy._attackCooldown <= 0) enemy._attackCooldown = 0.35;
      } else if (dist > attackRange) {
        enemy._inAttackRange = false;
      }

      if (enemy._attackCooldown > 0) {
        enemy._attackCooldown -= dt;
        continue;
      }
      if (dist > attackRange) continue;

      enemy._attackCooldown = enemy._attackSpeed ?? 1.5;
      this._applyHit(enemy, enemy._target, zone);
    }

    // Update hit flash timers
    for (const [id, flash] of this._hitFlash) {
      flash.timer -= dt;
      if (flash.timer <= 0) this._hitFlash.delete(id);
    }
  }

  _applyHit(attacker, target, zone) {
    // Check if this is a player↔enemy encounter — trigger turn-based battle
    const playerAttacksEnemy = attacker.tags?.has('player') && target.tags?.has('enemy');
    const enemyAttacksPlayer = attacker.tags?.has('enemy')  && target.tags?.has('player');

    if ((playerAttacksEnemy || enemyAttacksPlayer) && !this._inBattle) {
      const triggerEnemy = playerAttacksEnemy ? target : attacker;
      const player       = playerAttacksEnemy ? attacker : target;

      // Mark if player attacked first (for advantage detection in Game._startBattle)
      if (playerAttacksEnemy) triggerEnemy._playerHitFirst = true;

      const advantage = playerAttacksEnemy ? 'first_strike' : 'ambush';
      this.events.emit(EVENTS.BATTLE_START, { trigger: triggerEnemy, player, advantage });
      return; // Do not deal damage directly — BattleSystem handles it
    }

    // Non-encounter hit (e.g. friendly-fire, boss AoE vs other entities)
    let dmg;
    if (attacker.tags?.has('player')) {
      dmg = attacker.stats.derived.ATK + Math.floor(Math.random() * 5);
    } else {
      dmg = attacker.stats.derived.ATK + Math.floor(Math.random() * 3);
    }

    const actual = target.stats.takeDamage(dmg);
    this._hitFlash.set(target.id, { timer: 0.15, duration: 0.15 });

    this.events.emit(EVENTS.COMBAT_HIT, { attacker, target, damage: actual });
    this.events.emit(EVENTS.NOTIFICATION, { text: `-${actual}`, color: '#ff4444', x: target.cx, y: target.y });

    if (target.stats.isDead) {
      target.active = false;
      this.events.emit(EVENTS.ENTITY_DIED, { entity: target, killer: attacker });
    }
  }

  isFlashing(entityId) { return this._hitFlash.has(entityId); }
}
