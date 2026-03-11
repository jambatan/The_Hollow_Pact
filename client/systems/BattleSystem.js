import { EVENTS } from '../../shared/constants.js';

const AV_THRESHOLD = 1000;

export class BattleSystem {
  constructor(events) {
    this.events = events;
    this.state  = 'idle'; // 'idle' | 'resolving' | 'waiting_input'

    this.combatants  = []; // active battle participants: { entity, av, avRate, isPlayer, stunned, lunge, drift }
    this.pendingJoin = []; // secondary radius enemies: { entity, joinAV, joinRate }

    this._playerCombatant = null;
    this._chained  = false; // true after a low-cost move that enables follow-up
    this._battleLog = []; // last 5 messages
    this._targetIdx = 0;  // currently selected enemy target index

    // Free-move phase
    this._movePhase      = false;
    this._moveBudget     = 0;   // pixels remaining
    this._moveDistSoFar  = 0;
    this._movePrevX      = 0;
    this._movePrevY      = 0;

    // Brawl mode — friendly sparring, nobody dies; ends on HP thresholds
    this._brawlMode    = false;
    this._brawlerEntry = null; // combatant record for the NPC brawler

    // Network sync
    this._isHost             = true;   // false when this client joined another player's battle
    this._myNetworkId        = null;   // this client's network player ID
    this._waitingForNetworkId = null;  // networkId of remote player whose turn it is (host only)
    this._onSendAction       = null;   // fn(action) — guest calls this to relay action to host
  }

  // ── Static helpers ──

  static shouldAutoResolve(player, enemies) {
    const avgDmg = (player.stats?.derived?.ATK ?? 5) + 2.5;
    return enemies.every(e => avgDmg * 2 >= (e.stats?.current?.HP ?? Infinity));
  }

  // ── Start / End ──

  startBattle(playerEntity, enemies, advantage, allies = [], brawlMode = false) {
    this.combatants  = [];
    this.pendingJoin = [];
    this._chained    = false;
    this._targetIdx  = 0;
    this._battleLog  = [];

    // Zero all participant velocities so AI/overworld momentum doesn't carry in
    playerEntity.vx = 0; playerEntity.vy = 0;
    for (const e of enemies) { e.vx = 0; e.vy = 0; }

    // Reset sync state for new battle
    this._waitingForNetworkId = null;

    // Player combatant
    const playerAV = advantage === 'first_strike' ? AV_THRESHOLD
                   : advantage === 'ambush'        ? 0
                   : Math.floor(Math.random() * 400);
    const playerEntry = {
      entity: playerEntity,
      av: playerAV,
      avRate: (playerEntity.stats?.derived?.SPD ?? 25) * 20,
      isPlayer: true,
      networkId: null,   // Set by Game.js after startBattle
      stunned: false,
      lunge: null,   // { dx, dy, phase, timer }
      drift: null,   // { dx, dy, timer }
    };
    this.combatants.push(playerEntry);
    this._playerCombatant = playerEntry;

    // Enemy combatants — on ambush only the first (trigger) enemy gets full AV
    for (const [i, enemy] of enemies.entries()) {
      const enemyAV = advantage === 'ambush'
                    ? (i === 0 ? AV_THRESHOLD : Math.floor(Math.random() * 300))
                    : advantage === 'first_strike' ? 0
                    : Math.floor(Math.random() * 400);
      this.combatants.push({
        entity: enemy,
        av: enemyAV,
        avRate: (enemy.stats?.derived?.SPD ?? 20) * 20,
        isPlayer: false,
        stunned: false,
        lunge: null,
        drift: null,
        flankAngle: null, // target flank angle (radians) relative to player
      });
    }

    // Compute flank angles spread evenly
    const enemyCount = enemies.length;
    enemies.forEach((e, i) => {
      const entry = this.combatants.find(c => c.entity === e);
      if (entry) entry.flankAngle = (Math.PI * 2 * i / enemyCount) - Math.PI / 2;
    });

    // Ally combatants (escort NPCs, party followers, remote party players)
    for (const ally of allies) {
      ally.vx = 0; ally.vy = 0;
      const isRemotePlayer = ally.tags?.has('remote_player') ?? false;
      // Remote players get normal AV (their turns are delegated to their own client)
      const allyAV = Math.floor(Math.random() * (isRemotePlayer ? 200 : (advantage === 'first_strike' ? 400 : 300)));
      this.combatants.push({
        entity: ally,
        av: allyAV,
        avRate: (ally.stats?.derived?.SPD ?? (isRemotePlayer ? 80 : 20)) * 20,
        isPlayer: false,
        isAlly: true,
        isRemotePlayer,
        networkId: isRemotePlayer ? (ally.id ?? null) : null,
        stunned: false,
        lunge: null,
        drift: null,
        flankAngle: null,
      });
    }
    const npcAllies = allies.filter(a => !a.tags?.has('remote_player'));
    if (npcAllies.length) this._log(`${npcAllies.map(a => a.name).join(', ')} joins the fight!`);
    const rpAllies = allies.filter(a => a.tags?.has('remote_player'));
    if (rpAllies.length) this._log(`Party joined the battle!`);

    this._brawlMode    = brawlMode;
    this._brawlerEntry = brawlMode ? this.combatants.find(c => !c.isPlayer && !c.isAlly) ?? null : null;

    this.state = 'resolving';
    this._log(`Battle started! ${enemies.map(e => e.name).join(', ')}`);
  }

  addRemotePlayerAlly(rpEntity) {
    if (this.state === 'idle') return;
    if (this.combatants.some(c => c.entity === rpEntity)) return; // already present
    rpEntity.vx = 0; rpEntity.vy = 0;
    this.combatants.push({
      entity: rpEntity,
      av: 0,
      avRate: 0,         // acts on their own client only
      isPlayer: false,
      isAlly: true,
      isRemotePlayer: true,
      stunned: false,
      lunge: null,
      drift: null,
      flankAngle: null,
    });
    this._log('Party member joined the battle!');
  }

  // Called on host when a remote player submits their action
  applyGuestAction(action, networkId) {
    const actor = this.combatants.find(c => c.isRemotePlayer && c.networkId === networkId && c.av >= AV_THRESHOLD);
    if (!actor || this._waitingForNetworkId !== networkId) return;
    this._waitingForNetworkId = null;

    const enemies = this._activeEnemies();
    const targetByNetId = netId => enemies.find(c => c.entity._netId === netId);

    switch (action.type) {
      case 'attack': {
        const target = (action.targetNetId ? targetByNetId(action.targetNetId) : null) ?? enemies[0];
        if (target) { this._doAttack(actor, target); actor.av -= 600; }
        break;
      }
      case 'skill': {
        const skill = actor.entity.skillBook?.skills.get(action.skillId);
        if (skill) {
          const target = (action.targetNetId ? targetByNetId(action.targetNetId) : null) ?? enemies[0];
          if (target) {
            actor.entity.skillBook.use(action.skillId, actor.entity, [target.entity], this.events);
            actor.av -= skill.avCost ?? 800;
            this._log(`${actor.entity.name ?? 'Ally'} uses ${skill.name}!`);
          }
        }
        break;
      }
      case 'item': {
        const inv = actor.entity.inventory;
        if (inv && action.itemIdx != null) {
          const item = inv.slots[action.itemIdx];
          if (item?.type === 'consumable') {
            const eff = item.effect;
            if (eff?.type === 'heal')       actor.entity.stats?.heal(eff.amount);
            if (eff?.type === 'mp_restore') actor.entity.stats?.restoreMp(eff.amount);
            inv.remove(action.itemIdx, 1);
            this._log(`${actor.entity.name ?? 'Ally'} uses ${item.name}!`);
          }
        }
        actor.av -= 400;
        break;
      }
      case 'flee':
        this._log(`${actor.entity.name ?? 'Ally'} flees the battle!`);
        actor.entity.active = false;
        actor.av -= 400;
        break;
      default:
        actor.av -= 400;
    }
    this.state = 'resolving';
  }

  // Called on guest to mirror host battle state
  applyHostState(snapshot) {
    if (!snapshot?.combatants) return;
    for (const snap of snapshot.combatants) {
      let c;
      if (snap.netId) {
        c = this.combatants.find(x => x.entity._netId === snap.netId);
      } else if (snap.isPlayer && snap.networkId === this._myNetworkId) {
        c = this._playerCombatant;
      } else if (snap.networkId != null) {
        c = this.combatants.find(x => x.networkId === snap.networkId);
      }
      if (!c) continue;
      c.av = snap.av ?? c.av;
      if (!snap.active) c.entity.active = false;
      if (c.entity.stats && snap.hp != null) {
        c.entity.stats.current.HP = Math.max(0, Math.min(snap.hp,
          c.entity.stats.derived?.HP ?? snap.maxHp ?? snap.hp));
      }
    }
    this._waitingForNetworkId = snapshot.waitingForNetworkId ?? null;
    if (snapshot.log?.length) this._battleLog = snapshot.log;
    // Set local state based on who the host is waiting for
    if (this._waitingForNetworkId === this._myNetworkId) {
      this.state = 'waiting_input'; // it's our turn!
    } else {
      this.state = 'resolving'; // host's turn or enemy's turn — just watch
    }
  }

  // Serialize full battle state for broadcast (host → guests)
  serializeState() {
    return {
      combatants: this.combatants.map(c => ({
        netId: c.entity._netId ?? null,
        networkId: c.networkId ?? null,
        isPlayer: c.isPlayer,
        isAlly: c.isAlly ?? false,
        isRemotePlayer: c.isRemotePlayer ?? false,
        hp: c.entity.stats?.current?.HP ?? 0,
        maxHp: c.entity.stats?.derived?.HP ?? 1,
        av: Math.round(c.av),
        active: c.entity.active !== false,
      })),
      state: this.state,
      waitingForNetworkId: this._waitingForNetworkId ?? null,
      log: [...this._battleLog],
    };
  }

  // Guest update: only positional animations — AV/turns are driven by host state
  updateGuest(dt) {
    if (this.state === 'idle') return;
    this._updatePositional(dt);
  }

  addPendingJoin(enemy, joinRate) {
    this.pendingJoin.push({ entity: enemy, joinAV: 0, joinRate });
  }

  endBattle(outcome) {
    if (this._brawlMode) {
      // In brawl mode: restore everyone to at least 20% HP and re-activate
      for (const c of this.combatants) {
        if (!c.entity.stats) continue;
        const minHP = Math.max(1, Math.floor(c.entity.stats.derived.HP * 0.2));
        if ((c.entity.stats.current.HP ?? 0) < minHP) c.entity.stats.current.HP = minHP;
        c.entity.active = true;
      }
    } else {
      // Emit ENTITY_DIED for dead enemies (not allies) so loot/quests process
      for (const c of this.combatants) {
        if (!c.isPlayer && !c.isAlly && c.entity.stats?.isDead) {
          c.entity.active = false;
          this.events.emit(EVENTS.ENTITY_DIED, { entity: c.entity, killer: this._playerCombatant?.entity });
        }
      }
    }
    this.combatants  = [];
    this.pendingJoin = [];
    this.state = 'idle';
    this._brawlMode    = false;
    this._brawlerEntry = null;
    this.events.emit(EVENTS.BATTLE_END, { outcome });
  }

  // ── Update loop ──

  update(dt) {
    if (this.state === 'idle') return;

    // Update positional lunge/drift impulses
    this._updatePositional(dt);

    // Fill pending join AV
    this._updatePendingJoin(dt);

    if (this.state !== 'resolving') return;

    // Wait for all lunge/drift animations to finish before advancing turns
    const anyAnimating = this.combatants.some(c => c.lunge || c.drift);
    if (anyAnimating) return;

    // Fill AVs for active combatants
    for (const c of this.combatants) {
      if (c.entity.active === false) continue;
      c.av += c.avRate * dt;
    }

    // Remove dead/inactive combatants — keep player in list even when KO'd so battle can still end
    this.combatants = this.combatants.filter(c =>
      c.isPlayer || c.isRemotePlayer ||
      (c.entity.active !== false && !c.entity.stats?.isDead)
    );

    // Check win/lose (or brawl thresholds)
    const activeEnemies = this.combatants.filter(c => !c.isPlayer && !c.isAlly);
    if (this._brawlMode) {
      const pc = this._playerCombatant;
      const bc = this._brawlerEntry;
      if (pc && bc) {
        const playerPct  = (pc.entity.stats?.current?.HP ?? 1) / (pc.entity.stats?.derived?.HP ?? 1);
        const brawlerPct = (bc.entity.stats?.current?.HP ?? 1) / (bc.entity.stats?.derived?.HP ?? 1);
        if (brawlerPct < 0.2) { this.endBattle('win_brawl'); return; }
        if (playerPct  < 0.2) { this.endBattle('lose_brawl'); return; }
        if (playerPct < 0.4 && brawlerPct < 0.4) { this.endBattle('draw_brawl'); return; }
      }
    } else {
      if (activeEnemies.length === 0) { this.endBattle('win'); return; }
      // Lose only when ALL local friendlies (player + NPC allies) are KO'd — remote players fight on their own
      const anyAlive = this.combatants.some(c =>
        (c.isPlayer || (c.isAlly && !c.isRemotePlayer)) &&
        c.entity.active !== false && !c.entity.stats?.isDead
      );
      if (!anyAlive) { this.endBattle('lose'); return; }
    }

    // Find who has highest AV >= threshold
    let ready = this.combatants.filter(c => c.av >= AV_THRESHOLD && c.entity.active !== false && !c.entity.stats?.isDead);
    if (ready.length === 0) return;

    // Process the one with highest AV first
    ready.sort((a, b) => b.av - a.av);
    const actor = ready[0];

    if (actor.isPlayer) {
      this._freezeEnemies(); // zero enemy vel before MovementSystem runs this frame
      this.state = 'waiting_input';
    } else if (actor.isAlly) {
      if (actor.isRemotePlayer) {
        if (this._isHost) {
          // Host: pause and wait for the remote player's action via network
          this._waitingForNetworkId = actor.networkId;
          this.state = 'waiting_input';
        } else {
          // Guest: just consume this ally's AV (host handles their actual turn)
          actor.av -= 600;
          this.state = 'resolving';
        }
      } else {
        this._allyAct(actor);
      }
    } else {
      this._enemyAct(actor);
    }
  }

  _updatePositional(dt) {
    for (const c of this.combatants) {
      // Lunge animation — fast forward, slow return (net movement toward target)
      if (c.lunge) {
        c.lunge.timer -= dt;
        if (c.lunge.timer > c.lunge.duration * 0.5) {
          c.entity.vx = c.lunge.dx * c.lunge.fwdSpeed;
          c.entity.vy = c.lunge.dy * c.lunge.fwdSpeed;
        } else if (c.lunge.timer > 0) {
          c.entity.vx = -c.lunge.dx * c.lunge.retSpeed;
          c.entity.vy = -c.lunge.dy * c.lunge.retSpeed;
        } else {
          c.entity.vx = 0;
          c.entity.vy = 0;
          c.lunge = null;
        }
      }

      // Drift repulsion — skip while lunge is active (lunge takes priority)
      if (c.drift && !c.lunge) {
        c.drift.timer -= dt;
        if (c.drift.timer > 0) {
          c.entity.vx = c.drift.dx;
          c.entity.vy = c.drift.dy;
        } else {
          c.entity.vx = 0;
          c.entity.vy = 0;
          c.drift = null;
        }
      }

      // Enemy flanking drift — only during resolving; explicitly zero when not active
      if (!c.isPlayer && !c.lunge && !c.drift && c.flankAngle !== null) {
        if (this.state === 'resolving') {
          const player = this._playerCombatant?.entity;
          if (player) {
            const dx = c.entity.cx - player.cx;
            const dy = c.entity.cy - player.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleDiff = this._angleDiff(c.flankAngle, Math.atan2(dy, dx));
            const targetDist = 32;
            if (Math.abs(angleDiff) > 0.1 || Math.abs(dist - targetDist) > 4) {
              const targetX = player.cx + Math.cos(c.flankAngle) * targetDist;
              const targetY = player.cy + Math.sin(c.flankAngle) * targetDist;
              const tdx = targetX - c.entity.cx;
              const tdy = targetY - c.entity.cy;
              const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
              c.entity.vx = tdist > 2 ? (tdx / tdist) * 15 : 0;
              c.entity.vy = tdist > 2 ? (tdy / tdist) * 15 : 0;
            } else {
              c.entity.vx = 0;
              c.entity.vy = 0;
            }
          }
        } else {
          // Hold position during player's turn — clear any residual velocity
          c.entity.vx = 0;
          c.entity.vy = 0;
        }
      }
    }
  }

  _updatePendingJoin(dt) {
    // Pending join only advances while battle is resolving (pauses during player decision)
    const joinDt = this.state === 'resolving' ? dt : 0;
    const stillPending = [];
    for (const p of this.pendingJoin) {
      if (!p.entity.active) continue;
      p.joinAV += p.joinRate * joinDt;
      if (p.joinAV >= AV_THRESHOLD) {
        // Join the battle
        const enemyAV = Math.floor(Math.random() * 200);
        this.combatants.push({
          entity: p.entity,
          av: enemyAV,
          avRate: (p.entity.stats?.derived?.SPD ?? 20) * 20,
          isPlayer: false,
          stunned: false,
          lunge: null,
          drift: null,
          flankAngle: Math.random() * Math.PI * 2,
        });
        this._log(`${p.entity.name} joins the battle!`);
      } else {
        stillPending.push(p);
      }
    }
    this.pendingJoin = stillPending;
  }

  // ── Player Actions ──

  executePlayerAction(type, data = {}) {
    if (this.state !== 'waiting_input') return;
    if (this.isWaitingForOther) return; // not our turn

    // Guest: relay action to host instead of executing locally
    if (!this._isHost) {
      const enemies = this._activeEnemies();
      const target  = enemies[Math.min(this._targetIdx, enemies.length - 1)];
      this._onSendAction?.({ type, targetNetId: target?.entity?._netId ?? null, ...data });
      this.state = 'resolving'; // await host confirmation
      return;
    }

    const pc = this._playerCombatant;

    switch (type) {
      case 'attack': {
        const enemies = this._activeEnemies();
        const target = enemies[Math.min(this._targetIdx, enemies.length - 1)];
        if (!target) break;
        this._doAttack(pc, target);
        pc.av -= 600;
        break;
      }
      case 'skill': {
        const skillId = data.skillId;
        const skill = pc.entity.skillBook?.skills.get(skillId);
        if (!skill) break;
        let targets;
        if (data.arc) {
          targets = this._getArcTargets(data.facingAngle ?? 0, 48, Math.PI * 0.5);
        } else if (skill.targetAlly) {
          // Ally-targeting skill: target player or ally by index
          const friendlies = [pc, ...this.combatants.filter(c => c.isAlly && c.entity.active !== false && !c.entity.stats?.isDead)];
          const allyIdx = data.allyIdx ?? 0;
          const t = friendlies[Math.min(allyIdx, friendlies.length - 1)];
          targets = t ? [t.entity] : [pc.entity];
        } else {
          const enemies = this._activeEnemies();
          const target = enemies[Math.min(this._targetIdx, enemies.length - 1)];
          targets = [target?.entity].filter(Boolean);
        }
        if (targets.length > 0 || skill.targetAlly) {
          if (targets.length === 0) targets = [pc.entity]; // self-heal fallback
          pc.entity.skillBook.use(skillId, pc.entity, targets, this.events);
          pc.av -= (skill.avCost ?? 800);
          this._log(`You use ${skill.name}!`);
          if (data.arc) this._log(`Hit ${targets.length} target(s)!`);
        }
        break;
      }
      case 'item': {
        const inv = pc.entity.inventory;
        const item = inv?.slots[data.itemIdx];
        if (!item || item.type !== 'consumable') break;
        const eff = item.effect;
        if (eff?.type === 'heal') {
          pc.entity.stats.heal(eff.amount);
          this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} HP`, color: '#0c0' });
          this._log(`You use ${item.name} (+${eff.amount} HP)`);
        } else if (eff?.type === 'mp_restore') {
          pc.entity.stats.restoreMp(eff.amount);
          this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} MP`, color: '#44f' });
          this._log(`You use ${item.name} (+${eff.amount} MP)`);
        }
        inv.remove(data.itemIdx, 1);
        pc.av -= 400;
        break;
      }
      case 'move': {
        this.beginMovePhase();
        return; // state stays 'waiting_input'; Game.js drives player via WASD
      }
      case 'flee': {
        const success = Math.random() < 0.7;
        if (success) {
          this._log('You flee from battle!');
          this.endBattle('flee');
        } else {
          this._log('Failed to flee!');
          pc.av -= 400;
        }
        break;
      }
    }

    // Apply lunge animation toward target (lunge handles net forward movement, no extra drift)
    const enemies = this._activeEnemies();
    const target = enemies[Math.min(this._targetIdx, enemies.length - 1)];
    if (target && (type === 'attack' || type === 'skill')) {
      this._applyLunge(pc, target.entity);
    }

    this.state = 'resolving';
  }

  // ── Move phase ──

  beginMovePhase() {
    const pc = this._playerCombatant;
    if (!pc) return;
    const spd = pc.entity.stats?.derived?.SPD ?? 25;
    this._movePhase     = true;
    this._moveBudget    = Math.max(40, spd * 1.6); // ~40px base, scales with SPD
    this._moveDistSoFar = 0;
    this._movePrevX     = pc.entity.cx;
    this._movePrevY     = pc.entity.cy;
    this._log('Move! WASD to reposition.');
  }

  /** Called each frame by Game.js while inMoveMode; auto-commits when budget spent */
  trackMove(entity) {
    if (!this._movePhase) return;
    const dx = entity.cx - this._movePrevX;
    const dy = entity.cy - this._movePrevY;
    this._moveDistSoFar += Math.sqrt(dx * dx + dy * dy);
    this._movePrevX = entity.cx;
    this._movePrevY = entity.cy;
    if (this._moveDistSoFar >= this._moveBudget) this._commitMove();
  }

  confirmMove() {
    if (this._movePhase) this._commitMove();
  }

  cancelMove() {
    if (!this._movePhase) return;
    this._movePhase = false;
    const pc = this._playerCombatant;
    if (pc) { pc.entity.vx = 0; pc.entity.vy = 0; }
    // No AV cost, player picks again
  }

  _commitMove() {
    this._movePhase = false;
    const pc = this._playerCombatant;
    if (pc) { pc.entity.vx = 0; pc.entity.vy = 0; }
    pc.av -= 250;
    this._log('You move!');
    this._checkChain();
  }

  get inMoveMode() { return this._movePhase; }
  get moveProgress() { return this._moveBudget > 0 ? Math.min(1, this._moveDistSoFar / this._moveBudget) : 0; }

  _checkChain() {
    const pc = this._playerCombatant;
    const maxEnemyAV = Math.max(0, ...this.combatants.filter(c => !c.isPlayer).map(c => c.av));
    if (pc.av > maxEnemyAV) {
      this._chained = true;
      this._log('CHAIN! Move + follow-up available!');
    } else {
      this._chained = false;
    }
    // Always go through resolving so animations settle and enemies are frozen
    // before the follow-up waiting_input (anyAnimating gate handles the wait)
    this.state = 'resolving';
  }

  _freezeEnemies() {
    for (const c of this.combatants) {
      if (!c.isPlayer && !c.lunge && !c.drift) {
        c.entity.vx = 0;
        c.entity.vy = 0;
      }
    }
  }

  // ── Enemy AI ──

  _enemyAct(actor) {
    // Check for stun (set by stun_strike skill on entity)
    if (actor.stunned || actor.entity._battleStunned) {
      actor.stunned = false;
      actor.entity._battleStunned = false;
      actor.av -= 200; // small AV cost to prevent infinite stun loop
      this._log(`${actor.entity.name} is stunned, loses turn!`);
      this.state = 'resolving';
      return;
    }

    const pc = this._playerCombatant;
    if (!pc) return;

    const hpPct = actor.entity.stats.current.HP / actor.entity.stats.derived.HP;

    // Low HP: try to use heal skill
    if (hpPct < 0.3) {
      const healSkill = actor.entity.skillBook?.skills.get('heal');
      if (healSkill && !actor.entity.skillBook.isOnCooldown('heal')) {
        actor.entity.skillBook.use('heal', actor.entity, [actor.entity], this.events);
        actor.av -= 400;
        this._log(`${actor.entity.name} heals itself!`);
        this.state = 'resolving';
        return;
      }
    }

    // Attack the lowest-HP friendly (player or NPC ally — not remote players, they're on their own client)
    const friendlies = this.combatants.filter(c =>
      (c.isPlayer || (c.isAlly && !c.isRemotePlayer)) && c.entity.active !== false && !c.entity.stats?.isDead
    );
    if (!friendlies.length) { actor.av -= 200; this.state = 'resolving'; return; }
    const target = friendlies.reduce((a, b) =>
      (a.entity.stats?.current?.HP ?? Infinity) <= (b.entity.stats?.current?.HP ?? Infinity) ? a : b
    );
    this._doAttack(actor, target);
    actor.av -= 600;
    this.state = 'resolving';
  }

  _allyAct(actor) {
    // Healer behavior: if any friendly is below 50% HP and heal skill is available, use it
    if (actor.entity.skillBook) {
      const healSkill = actor.entity.skillBook.skills.get('heal');
      if (healSkill && !actor.entity.skillBook.isOnCooldown('heal')) {
        const friendlies = this.combatants.filter(c =>
          (c.isPlayer || c.isAlly) && c.entity.active !== false && !c.entity.stats?.isDead
        );
        const wounded = friendlies.find(c => {
          const hp = c.entity.stats?.current?.HP ?? 0;
          const maxHp = c.entity.stats?.derived?.HP ?? 1;
          return hp / maxHp < 0.5;
        });
        if (wounded) {
          actor.entity.skillBook.use('heal', actor.entity, [wounded.entity], this.events);
          actor.av -= 400;
          this._log(`${actor.entity.name} heals ${wounded.entity.name}!`);
          this.state = 'resolving';
          return;
        }
      }
    }

    const enemies = this._activeEnemies();
    if (!enemies.length) { actor.av -= 200; this.state = 'resolving'; return; }
    // Target the lowest-HP enemy
    const target = enemies.reduce((a, b) =>
      (a.entity.stats?.current?.HP ?? Infinity) <= (b.entity.stats?.current?.HP ?? Infinity) ? a : b
    );
    this._doAttack(actor, target);
    actor.av -= 600;
    this.state = 'resolving';
  }

  _doAttack(attacker, target) {
    let dmg = (attacker.entity.stats?.derived?.ATK ?? 5) + Math.floor(Math.random() * (attacker.isPlayer ? 5 : 3));
    // In brawl mode, clamp damage so target can't drop below 1 HP
    if (this._brawlMode && target.entity.stats) {
      dmg = Math.min(dmg, (target.entity.stats.current.HP ?? 1) - 1);
      if (dmg < 1) dmg = 1;
    }
    const actual = target.entity.stats?.takeDamage(dmg) ?? dmg;

    this._applyLunge(attacker, target.entity);
    // Knockback drift on target only — don't overwrite existing drift (prevents chain stacking)
    if (!target.drift) {
      const dx = target.entity.cx - attacker.entity.cx;
      const dy = target.entity.cy - attacker.entity.cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      target.drift = { dx: (dx / dist) * 10, dy: (dy / dist) * 10, timer: 0.5 };
    }

    const color = attacker.isPlayer ? '#ff4444' : attacker.isAlly ? '#88ff88' : '#ff8844';
    this.events.emit(EVENTS.NOTIFICATION, { text: `-${actual}`, color, x: target.entity.cx, y: target.entity.y });
    const who  = attacker.isPlayer ? 'You' : attacker.entity.name;
    const whom = target.isPlayer   ? 'you' : target.entity.name;
    const verb = attacker.isPlayer ? 'attack' : 'attacks';
    this._log(`${who} ${verb} ${whom} for ${actual}!`);

    if (target.entity.stats?.isDead) {
      target.entity.active = false;
      if (target.isPlayer) {
        this._log('You are defeated...');
      } else if (target.isAlly) {
        this._log(`${target.entity.name} is defeated!`);
      } else {
        this._log(`${target.entity.name} is defeated!`);
        this.events.emit(EVENTS.ENTITY_DIED, { entity: target.entity, killer: attacker.entity });
      }
    }
  }

  _applyLunge(actor, targetEntity) {
    if (!actor || actor.lunge) return;
    const dx = targetEntity.cx - actor.entity.cx;
    const dy = targetEntity.cy - actor.entity.cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = actor.entity.stats?.derived?.SPD ?? 55;
    const halfDur = 0.15; // seconds per phase
    // Cap forward distance so we stop just short of target (6px gap), never overshoot
    const maxFwdDist = Math.max(0, dist - 6);
    const fwdSpeed   = Math.min(spd * 3, maxFwdDist / halfDur);
    const retSpeed   = fwdSpeed * 0.15; // small retreat back
    actor.lunge = {
      dx: dx / dist, dy: dy / dist,
      timer: halfDur * 2, duration: halfDur * 2,
      fwdSpeed, retSpeed,
    };
  }

  // ── Targeting helpers ──

  _activeEnemies() {
    return this.combatants.filter(c => !c.isPlayer && !c.isAlly && c.entity.active !== false && !c.entity.stats?.isDead);
  }

  _getArcTargets(facingAngle, range, halfAngle) {
    const pc = this._playerCombatant?.entity;
    if (!pc) return [];
    return this._activeEnemies()
      .filter(c => {
        const dx = c.entity.cx - pc.cx;
        const dy = c.entity.cy - pc.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > range) return false;
        const angle = Math.atan2(dy, dx);
        return Math.abs(this._angleDiff(angle, facingAngle)) < halfAngle;
      })
      .map(c => c.entity);
  }

  cycleTaret(dir) {
    const enemies = this._activeEnemies();
    if (!enemies.length) return;
    this._targetIdx = (this._targetIdx + dir + enemies.length) % enemies.length;
  }

  // ── Turn order preview ──

  getTurnOrder(count = 8) {
    // Simulate AV fills forward
    const sim = this.combatants
      .filter(c => c.entity.active !== false && !c.entity.stats?.isDead)
      .map(c => ({ entity: c.entity, av: c.av, avRate: c.avRate, isPlayer: c.isPlayer, isAlly: c.isAlly ?? false }));

    const order = [];
    let ticks = 0;
    while (order.length < count && ticks < 500) {
      ticks++;
      for (const s of sim) s.av += s.avRate * 0.016; // ~60fps tick
      const ready = sim.filter(s => s.av >= AV_THRESHOLD);
      ready.sort((a, b) => b.av - a.av);
      for (const r of ready) {
        order.push({ entity: r.entity, isPlayer: r.isPlayer, isAlly: r.isAlly });
        r.av -= 600; // approximate action cost
        if (order.length >= count) break;
      }
    }

    // Also add pending joiners
    for (const p of this.pendingJoin) {
      if (!p.entity.active) continue;
      order.push({ entity: p.entity, isPlayer: false, pending: true, progress: p.joinAV / AV_THRESHOLD });
    }

    return order;
  }

  // ── Utility ──

  _log(msg) {
    this._battleLog.push(msg);
    if (this._battleLog.length > 5) this._battleLog.shift();
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI)  d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  get activeEnemyCombatants() { return this._activeEnemies(); }
  get playerCombatant() { return this._playerCombatant; }
  get isChained() { return this._chained; }
  // True when state=waiting_input but it's a remote player's turn, not ours
  get isWaitingForOther() {
    return this._waitingForNetworkId != null && this._waitingForNetworkId !== this._myNetworkId;
  }
}
