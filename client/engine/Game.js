import { EventBus }              from './EventBus.js';
import { GameLoop }             from './GameLoop.js';
import { InputManager }         from './InputManager.js';
import { Camera }               from './Camera.js';
import { AssetLoader }          from './AssetLoader.js';
import { Renderer }             from './Renderer.js';

import { World }                from '../world/World.js';

import { Player }               from '../entities/Player.js';
import { RemotePlayer }         from '../entities/RemotePlayer.js';
import { RemoteNPC }            from '../entities/RemoteNPC.js';
import { NPC }                  from '../entities/NPC.js';
import { Enemy }                from '../entities/Enemy.js';

import { MovementSystem }       from '../systems/MovementSystem.js';
import { CombatSystem }         from '../systems/CombatSystem.js';
import { AISystem }             from '../systems/AISystem.js';
import { BattleSystem }         from '../systems/BattleSystem.js';
import { LootSystem }           from '../systems/LootSystem.js';
import { SpawnSystem }          from '../systems/SpawnSystem.js';
import { ScheduleSystem }       from '../systems/ScheduleSystem.js';
import { DialogueSystem }       from '../systems/DialogueSystem.js';
import { QuestSystem }          from '../systems/QuestSystem.js';
import { ZoneTransitionSystem } from '../systems/ZoneTransitionSystem.js';
import { PuzzleSystem }         from '../systems/PuzzleSystem.js';

import { Inventory }            from '../inventory/Inventory.js';
import { Equipment }            from '../inventory/Equipment.js';
import { ItemFactory }          from '../inventory/ItemFactory.js';
import { SkillBook }            from '../stats/SkillBook.js';
import { StatBlock }            from '../stats/StatBlock.js';

import { Shop }                 from '../economy/Shop.js';

import { UIManager }            from '../ui/UIManager.js';
import { CharacterSelectUI }    from '../ui/CharacterSelectUI.js';

import { NetworkManager }       from '../network/NetworkManager.js';

import { EVENTS, CANVAS_W, CANVAS_H } from '../../shared/constants.js';
import { TILE } from '../world/TileMap.js';

// Data imports
import { ENEMY_DB }   from '../data/enemies.js';
import { NPC_DB }     from '../data/npcs.js';
import { QUEST_DB }   from '../data/quests.js';
import { SHOP_DB }    from '../data/shops.js';
import ashenvaleZone  from '../data/zones/ashenvale.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Core
    this.events = new EventBus();
    this.input  = new InputManager(canvas);
    this.camera = new Camera();
    this.assets = new AssetLoader();
    this.renderer = new Renderer(canvas, this.ctx, this.camera, this.assets);

    // World
    this.world  = new World(this.events);

    // Systems
    this.systems = {
      movement:   new MovementSystem(this.input),
      combat:     new CombatSystem(this.events),
      ai:         new AISystem(this.events),
      battle:     new BattleSystem(this.events),
      loot:       new LootSystem(this.events),
      spawn:      new SpawnSystem(this.events),
      schedule:   new ScheduleSystem(),
      dialogue:   new DialogueSystem(this.events),
      quest:      new QuestSystem(this.events, QUEST_DB, () => this.localPlayer),
      transition: new ZoneTransitionSystem(this.events),
      puzzle:     new PuzzleSystem(this.events),
    };

    // UI
    this.ui = new UIManager(this.events);
    this.ui.devConsole.setGame(this);

    // Network
    this.network     = new NetworkManager(this.events);
    this._remotePlayers = new Map(); // id → RemotePlayer
    this._remoteNpcs    = new Map(); // `${ownerId}:${npcId}` → RemoteNPC

    // Players
    this.localPlayer = null;
    this._allPlayers  = [];

    // Battle state
    this._inBattle = false;

    // Escort follower tracking (reliable reference across zone transitions)
    this._escortFollowers = new Map(); // npcId → entity

    // Permanent party members (survive all zone transitions)
    this._partyMembers  = new Map(); // npcId → entity

    // Brawl post-battle timers / deferred dialogue
    this._pipSpawnTimer   = -1;  // counts down from 2s; when ≤0 spawns Pip
    this._currentBrawler  = null; // brawler entity for current/last brawl
    this._pendingDialogue = null; // { npc, treeId, delay } — triggers auto-dialogue

    // Zone name display
    this._zoneNameTimer = 0;
    this._zoneName = '';

    // Passive regen (out of battle)
    this._regenTimer = 0;

    // Entity sync (continuous enemy state broadcast to zone peers)
    this._entitySyncTimer = 0;

    // Battle host tracking (null = I'm host, or networkId of battle host)
    this._battleHostId    = null;
    this._battleSyncTimer = 0;

    // Network party state
    this._remotePartyIds   = new Set(); // player IDs of remote party members
    this._pendingPartyInvite = null;    // { fromId } — waiting for Y/N
    this._pendingZoneFollow  = null;    // { zoneId, fromId } — follow party to zone?

    // Character persistence
    this._charLoaded     = false;      // true once auth/create succeeds
    this._charList       = [];         // cached from server for dev console
    this._charName       = null;       // authenticated char name
    this._saveTimer      = 0;
    this._charSelectUI   = new CharacterSelectUI();
    this._savedPartyNpcs = [];         // NPC party member IDs to restore on load
    this._pendingZoneLoad = null;      // { zone, x, y } — load after char apply
    this._isDead = false;              // true while death screen is shown
    this._deathTimer = 0;             // grace period before input accepted
    this._koInBattle = false;         // player KO'd mid-battle (allies still fighting)

    // Game loop (created in init)
    this._loop = null;
  }

  async init() {
    // Load tilesets (soft-fail — canvas fallback used if files missing)
    await this.assets.load('tiles', '/assets/tilesets/roguelikeSheet_transparent.png');
    this.assets.registerTileset('tiles', 16, 16, 1); // 16×16 tiles, 1px margin
    await this.assets.load('chars', '/assets/tilesets/roguelikeChar_transparent.png');
    this.assets.registerTileset('chars', 16, 16, 1); // character sprites, same format

    // Register zones
    this.world.registerDef(ashenvaleZone);
    // Additional zones registered lazily when loaded

    // Load starting zone
    await this.world.loadZone('ashenvale', zone => this._populateZone(zone));

    // Create local player
    const sp = this.world.current.spawnPoint;
    this.localPlayer = this._createLocalPlayer(sp.x, sp.y);
    this.world.current.addEntity(this.localPlayer);
    this._allPlayers  = [this.localPlayer];

    // Wire camera
    this.camera.follow(this.localPlayer);

    // Connect to server (non-blocking — game works without it)
    this._initNetwork();

    // Wire char-select UI callbacks and network response handler
    this._charSelectUI.onAuthenticate = (name, pin) => this.network.sendCharLoad(name, pin);
    this._charSelectUI.onCreate       = (name, pin) => this.network.sendCharCreate(name, pin);
    this.network.onCharData = result => {
      if (result.list !== undefined) {
        this._charList = result.list;
        this._charSelectUI.setList(result.list);
        return;
      }
      if (result.success) {
        this._applyCharData(result.data);
        this._charLoaded = true;
        // Trigger deferred zone load if char was in a different zone
        if (this._pendingZoneLoad) {
          const { zone, x, y } = this._pendingZoneLoad;
          this._pendingZoneLoad = null;
          this.events.emit(EVENTS.ZONE_TRANSITION, { player: this.localPlayer, toZone: zone, toX: x, toY: y });
        } else {
          // Same zone — restore party NPCs now (no transition will do it)
          this._restorePartyNpcs();
        }
      } else {
        this._charSelectUI.setError(result.error ?? 'Server error');
      }
    };

    // Listen for zone transitions
    this.events.on(EVENTS.ZONE_TRANSITION, d => this._handleTransition(d));
    this.events.on(EVENTS.BATTLE_START, d => this._startBattle(d));
    this.events.on(EVENTS.BATTLE_END,   d => this._endBattle(d));
    this.events.on(EVENTS.ZONE_CHANGED, ({ zone }) => {
      this._zoneName = zone.name;
      this._zoneNameTimer = 3;
      // _saveChar() called in _handleTransition after player is repositioned
    });
    this.events.on(EVENTS.PLAYER_LEVEL_UP, () => {
      this.events.emit(EVENTS.NOTIFICATION, { text: `LEVEL UP! (${this.localPlayer.level})`, color: '#ffff00' });
      if (this._charLoaded) this._saveChar();
    });
    this.events.on(EVENTS.QUEST_COMPLETED, () => {
      if (this._charLoaded) this._saveChar();
    });
    this.events.on(EVENTS.SHOP_CLOSE, () => {
      if (this._charLoaded) this._saveChar();
    });

    // Escort: start NPC following when escort quest accepted
    this.events.on(EVENTS.QUEST_UPDATED, ({ questId, status }) => {
      if (status !== 'accepted') return;
      const def = QUEST_DB[questId];
      const escortNpcId = def?.stages[0]?.escortNpcId;
      if (!escortNpcId) return;
      const zone = this.world.current;
      const npc = zone?.entities.find(e => e.id === escortNpcId);
      if (npc) {
        npc._followPlayer = true;
        npc._homeZoneId   = zone.id;
        npc._homeX = npc.x;
        npc._homeY = npc.y;
        this._escortFollowers.set(escortNpcId, npc);
      }
    });

    // Escort: stop following on complete or abandon
    this.events.on(EVENTS.ESCORT_RESET, ({ npcId, reason, destX, destY, destDialogue }) => {
      this._resetEscortNpc(npcId, reason, destX, destY, destDialogue);
    });

    // Party member joined
    this.events.on(EVENTS.PARTY_JOINED, ({ npc }) => this._addPartyMember(npc));

    // Dialogue-triggered NPC tree change (e.g. Rogan vouching for Pip/Nara)
    this.events.on(EVENTS.NPC_TREE_SET, ({ npcId, treeId }) => {
      for (const [, zone] of this.world._zones) {
        const npc = zone.entities.find(e => e.id === npcId);
        if (npc) { npc.dialogueTree = treeId; break; }
      }
    });

    // XP sharing with party NPC members + broadcast kill to same-zone peers
    this.events.on(EVENTS.ENTITY_DIED, ({ entity, killer }) => {
      // Broadcast enemy kill so peers in same zone deactivate their copy
      if (entity._netId && entity.tags?.has('enemy') && this.network.isConnected) {
        this.network.sendEntitySync({ kills: [entity._netId] });
      }

      if (!entity.xpReward || !killer?.tags?.has('player')) return;
      const xpShare = Math.floor(entity.xpReward * 0.5);
      for (const pm of this._partyMembers.values()) {
        if (pm.active && pm.stats) this._grantPartyMemberXP(pm, xpShare);
      }
    });

    // Escort off-route warning → show dialogue instead of floating text
    this.events.on(EVENTS.ESCORT_WARNING, ({ npcId, count, limit, abandoned }) => {
      const npc = this._escortFollowers.get(npcId)
        ?? [...this.world._zones.values()].flatMap(z => [...z.entities]).find(e => e.id === npcId);
      if (!npc) return;
      const treeId = abandoned       ? 'escort_abandoned'
                   : count >= limit - 1 ? 'escort_warning_urgent'
                   : 'escort_warning_mild';
      // Short delay so zone-change settles before dialogue pops
      this._pendingDialogue = { npc, treeId, delay: 0.4 };
    });

    // Start game loop
    this._loop = new GameLoop(
      dt => this._update(dt),
      alpha => this._render(alpha)
    );
    this._loop.start();
  }

  _createLocalPlayer(x, y) {
    const player = new Player(x, y, true);
    // Wire up inventory + equipment
    player.stats = new StatBlock({ STR: 5, DEX: 5, INT: 3, CON: 5, WIS: 3, CHA: 3 });
    player.stats.recalc();
    player.stats.current.HP = player.stats.derived.HP;
    player.stats.current.MP = player.stats.derived.MP;
    player.inventory = new Inventory(this.events, 24);
    player.equipment = new Equipment(this.events, player.stats);
    player.skillBook = new SkillBook();
    player._attackSpeed = 1.2;
    player._attackCooldown = 0;

    // Register starter skills
    player.skillBook.register('slash', {
      name: 'Power Slash', mpCost: 5, cooldown: 3, avCost: 800,
      execute: (caster, targets, events) => {
        for (const t of targets) {
          const dmg = Math.floor(caster.stats.derived.ATK * 1.8) + Math.floor(Math.random() * 6);
          const actual = t.stats?.takeDamage(dmg) ?? dmg;
          events.emit(EVENTS.NOTIFICATION, { text: `-${actual}`, color: '#ff8800', x: t.cx, y: t.y });
          if (t.stats?.isDead) { t.active = false; events.emit(EVENTS.ENTITY_DIED, { entity: t, killer: caster }); }
        }
      },
    });
    player.skillBook.register('heal', {
      name: 'Heal', mpCost: 15, cooldown: 8, avCost: 400, targetAlly: true,
      execute: (caster, targets, events) => {
        const healTarget = targets[0] ?? caster;
        const amount = Math.floor(caster.stats.derived.HP * 0.3);
        healTarget.stats.heal(amount);
        events.emit(EVENTS.NOTIFICATION, { text: `+${amount} HP → ${healTarget.name}`, color: '#00ff00' });
      },
    });
    player.skillBook.register('stun_strike', {
      name: 'Stun Strike', mpCost: 8, cooldown: 5, avCost: 700,
      execute: (caster, targets, events) => {
        for (const t of targets) {
          const dmg = caster.stats.derived.ATK + Math.floor(Math.random() * 5);
          const actual = t.stats?.takeDamage(dmg) ?? dmg;
          if (t) t._battleStunned = true;
          events.emit(EVENTS.NOTIFICATION, { text: `Stunned! -${actual}`, color: '#ffff00', x: t.cx, y: t.y });
          if (t.stats?.isDead) { t.active = false; events.emit(EVENTS.ENTITY_DIED, { entity: t, killer: caster }); }
        }
      },
    });

    return player;
  }

  // ── Character persistence ─────────────────────────────────────────────────

  _applyCharData(data) {
    console.log('[LOAD]', data.name, `lv:${data.level ?? 1} xp:${data.xp ?? 0} gold:${data.gold ?? 0}`, 'zone:', data.lastZone, 'equip:', JSON.stringify(data.equipment), 'inv:', data.inventory?.length);
    this._charName = data.name;
    const p  = this.localPlayer;
    const qs = this.systems.quest;

    // Base stats (StatBlock)
    const bs = data.baseStats ?? {};
    for (const k of Object.keys(bs)) if (p.stats.base[k] !== undefined) p.stats.base[k] = bs[k];
    p.stats.recalc();
    p.stats.current.HP = p.stats.derived.HP;
    p.stats.current.MP = p.stats.derived.MP;

    // Level / XP live on Player entity directly (not StatBlock)
    p.level    = data.level ?? 1;
    p.xp       = data.xp    ?? 0;
    p.xpToNext = Math.floor(100 * Math.pow(p.level, 1.5));

    // Gold
    p.gold = data.gold ?? 0;

    // Inventory (clear then restore)
    p.inventory.slots.fill(null);
    for (const s of data.inventory ?? []) {
      const item = ItemFactory.create(s.itemId, s.qty);
      if (item) { if (s.durability != null) item.durability = s.durability; p.inventory.add(item); }
    }

    // Equipment — direct slot assignment (items saved separately from inventory)
    for (const [slot, itemId] of Object.entries(data.equipment ?? {})) {
      if (!itemId || !(slot in p.equipment.slots)) continue;
      const item = ItemFactory.create(itemId, 1);
      if (item) p.equipment.slots[slot] = item;
    }
    p.equipment._recalcBonuses(); // apply all equipment stat bonuses once

    // Quests
    for (const [id, q] of Object.entries(data.quests?.active ?? {})) {
      const def = QUEST_DB[id];
      if (def) qs.active.set(id, { def, stage: q.stage, progress: q.progress ?? {} });
    }
    for (const id of data.quests?.completed  ?? []) qs.completed.add(id);
    for (const id of data.quests?.trackedIds ?? []) qs.trackedIds?.add(id);

    // Last position / zone
    const sp = this.world.current?.spawnPoint;
    if (data.lastZone && data.lastZone !== this.world.current?.id) {
      this._pendingZoneLoad = { zone: data.lastZone, x: data.lastX, y: data.lastY };
    } else if (data.lastX != null) {
      p.x = data.lastX - p.w / 2; p.y = data.lastY - p.h / 2;
    }

    // NPC party members to restore (applied lazily on zone populate)
    this._savedPartyNpcs = data.partyNpcs ?? [];
  }

  _buildCharSave() {
    const p  = this.localPlayer;
    const qs = this.systems.quest;
    const STATS_KEYS = ['STR','DEX','INT','CON','WIS','CHA'];
    return {
      level:     p.level  ?? 1,
      xp:        p.xp     ?? 0,
      gold:      p.gold ?? 0,
      baseStats: Object.fromEntries(STATS_KEYS.map(k => [k, p.stats.base[k] ?? 5])),
      inventory: p.inventory.slots
        .filter(Boolean)
        .map(s => ({ itemId: s.itemId, qty: s.qty, durability: s.durability ?? null })),
      equipment: Object.fromEntries(
        Object.entries(p.equipment.slots).filter(([,v]) => v).map(([k,v]) => [k, v.itemId])
      ),
      quests: {
        active:     Object.fromEntries([...qs.active.entries()].map(([id,q]) => [id, { stage: q.stage, progress: q.progress ?? {} }])),
        completed:  [...qs.completed],
        trackedIds: [...(qs.trackedIds ?? [])],
      },
      lastZone:  this.world.current?.id ?? 'ashenvale',
      lastX:     p.x + p.w / 2,
      lastY:     p.y + p.h / 2,
      partyNpcs: [...this._partyMembers.keys()],
    };
  }

  _saveChar() {
    if (!this._charName) return;
    let data;
    try { data = this._buildCharSave(); } catch (e) { console.error('[SAVE build error]', e); return; }
    console.log('[SAVE]', data.lastZone, `lv:${data.level} xp:${data.xp} gold:${data.gold}`, 'equip:', JSON.stringify(data.equipment), 'inv:', data.inventory.length);
    // HTTP save — works regardless of WebSocket state (server restarts break WS mid-session)
    fetch(`/dev/api/characters/${encodeURIComponent(this._charName)}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()).then(r => console.log('[SAVE response]', r)).catch(e => console.error('[SAVE error]', e));
  }

  _respawn() {
    const p = this.localPlayer;
    const penalty = Math.floor((p.gold ?? 0) * 0.1);
    p.gold = Math.max(0, (p.gold ?? 0) - penalty);
    p.stats.current.HP = p.stats.derived.HP;
    p.stats.current.MP = p.stats.derived.MP;
    p.active = true;
    this._isDead = false;
    this._deathTimer = 0;
    // Teleport to zone spawn point
    const sp = this.world.current?.spawnPoint;
    if (sp) { p.x = sp.x - p.w / 2; p.y = sp.y - p.h / 2; }
    this.camera.x = p.cx - this.camera.viewW / 2;
    this.camera.y = p.cy - this.camera.viewH / 2;
    // Restore party members to 1 HP
    for (const pm of this._partyMembers.values()) {
      if (pm.stats && pm.stats.current.HP < 1) pm.stats.current.HP = 1;
      pm.active = true;
    }
    if (penalty > 0) this.events.emit(EVENTS.NOTIFICATION, { text: `-${penalty}g lost`, color: '#ff8888' });
    this.events.emit(EVENTS.NOTIFICATION, { text: 'Respawned.', color: '#88aaff' });
    if (this._charLoaded) this._saveChar();
  }

  _populateZone(zone) {
    // Reset spawn timers for this zone so enemies appear immediately on entry
    for (const def of zone.spawnDefs) {
      this.systems.spawn._state.delete(def.id);
    }

    // Spawn NPCs defined in zone.npcDefs
    for (const npcRef of zone.npcDefs) {
      const def = NPC_DB[npcRef.id];
      if (!def) continue;
      // Skip if this NPC is already in the active party (they follow the player instead)
      if (this._partyMembers.has(npcRef.id)) continue;
      const npc = new NPC(def, npcRef.x, npcRef.y);
      // Wire shop instance if merchant
      if (def.shopId && SHOP_DB[def.shopId]) {
        npc._shopInstance = new Shop(this.events, def.shopId, SHOP_DB[def.shopId]);
      }
      // Wire combat stats if NPC is a combatant (brawler, party NPCs, etc.)
      if (def.combatStats) {
        npc.stats = new StatBlock(def.combatStats);
        npc.stats.recalc();
        npc.stats.current.HP = npc.stats.derived.HP;
        npc.stats.current.MP = npc.stats.derived.MP ?? 0;
      }
      // Wire fight-or-flight behavior
      if (def.combatBehavior) {
        npc._combatBehavior = def.combatBehavior;
        npc._guardRange = def.guardRange ?? 150;
        npc._fleeRange  = def.fleeRange  ?? 120;
        npc._attackRange = def.attackRange ?? 18;
      }
      zone.addEntity(npc);
    }
  }

  _initNetwork() {
    this.network.onPlayerJoin = snap => {
      if (this._remotePlayers.has(snap.id)) return;
      const rp = new RemotePlayer(snap.id, snap.x, snap.y);
      rp._charName = snap.charName ?? null;
      this._remotePlayers.set(snap.id, rp);
      this.world.current?.addEntity(rp);
      this._allPlayers = [this.localPlayer, ...this._remotePlayers.values()];
    };
    this.network.onPlayerLeave = id => {
      const rp = this._remotePlayers.get(id);
      if (rp) {
        // Remove from whichever zone they're currently in
        const zone = rp._currentZoneId ? this.world._zones.get(rp._currentZoneId) : this.world.current;
        zone?.removeEntity(rp);
        this._remotePlayers.delete(id);
        this._allPlayers = [this.localPlayer, ...this._remotePlayers.values()];
      }
      // Remove any ghost NPCs owned by this player
      this._syncRemoteNpcs(id, null, []);
    };
    this.network.onSnapshot = snaps => {
      for (const snap of snaps) {
        const snapZone = snap.zoneId ?? 'ashenvale';
        if (!this._remotePlayers.has(snap.id)) {
          const rp = new RemotePlayer(snap.id, snap.x, snap.y);
          rp._charName = snap.charName ?? null;
          rp._currentZoneId = snapZone;
          this._remotePlayers.set(snap.id, rp);
          // Only add to a zone if it's already loaded — reconcile handles the rest
          const targetZone = this.world._zones.get(snapZone);
          if (targetZone) targetZone.addEntity(rp);
          else if (snapZone === this.world.current?.id) this.world.current.addEntity(rp);
          this._allPlayers = [this.localPlayer, ...this._remotePlayers.values()];
        }
        const rp = this._remotePlayers.get(snap.id);
        if (rp && snap.zoneId && snap.zoneId !== rp._currentZoneId) {
          // Zone changed — move entity to the new zone's entity list
          this._moveRemotePlayerToZone(rp, snap.zoneId);
        }
        if (rp) {
          rp.applySnapshot(snap);
          if (snap.charName) rp._charName = snap.charName;
        }

        // Sync remote player's party NPCs
        this._syncRemoteNpcs(snap.id, snap.zoneId ?? 'ashenvale', snap.partyNpcs ?? []);
      }
    };

    // Party callbacks
    this.network.onPartyInvite = ({ fromId, fromName }) => {
      this._pendingPartyInvite = { fromId, fromName: fromName ?? `Player ${fromId}` };
      // Banner rendered persistently by UIManager — no floating notification
    };
    this.network.onPartyUpdate = ({ members }) => {
      this._remotePartyIds = new Set(members.filter(id => id !== this.network.localId));
      this.events.emit(EVENTS.NOTIFICATION, { text: `Party formed (${members.length} players)`, color: '#88ccff' });
    };
    this.network.onPartyZone = ({ fromId, zoneId }) => {
      if (!this._remotePartyIds.has(fromId)) return;
      if (zoneId === this.world.current?.id) return; // already here — no prompt
      if (this._pendingZoneFollow?.zoneId === zoneId) return; // already prompted
      const rp = [...this._remotePlayers.values()].find(r => r.id === fromId);
      const fromName = rp?._charName ?? rp?.name ?? `Player ${fromId}`;
      this._pendingZoneFollow = { zoneId, fromId, fromName };
      // Banner rendered persistently by UIManager
    };

    this.network.onEntitySync = ({ kills, entities, battleJoin, battleState, battleAction, battleEnd: battleEndData }) => {
      // Kill sync — deactivate enemies killed by a peer
      if (kills?.length) {
        for (const netId of kills) {
          const enemy = this._findEnemyByNetId(netId);
          if (enemy?.active) enemy.active = false;
        }
      }

      // Continuous HP/position sync from zone peer (5 Hz)
      if (entities?.length) {
        for (const snap of entities) {
          const enemy = this._findEnemyByNetId(snap.netId);
          if (!enemy) continue;
          if (snap.active === false) { enemy.active = false; continue; }
          if (!this._inBattle) { enemy.x = snap.x; enemy.y = snap.y; }
          if (enemy.stats) enemy.stats.current.HP = Math.max(0, Math.min(snap.hp, enemy.stats.derived.HP));
        }
      }

      // Battle join — peer started a battle, auto-join as guest
      if (battleJoin && !this._inBattle) {
        this._joinSharedBattle(battleJoin);
      }

      // Battle state from host → apply to guest's BattleSystem
      if (battleState && this._inBattle && this._battleHostId !== null) {
        this.systems.battle.applyHostState(battleState);
      }

      // Guest action relayed to host → host applies it and re-broadcasts
      if (battleAction && this._inBattle && this._battleHostId === null) {
        this.systems.battle.applyGuestAction(battleAction, battleAction.networkId);
        // Immediately broadcast updated state after guest action
        if (this.network.isConnected) {
          this.network.sendEntitySync({ battleState: this.systems.battle.serializeState() });
        }
      }

      // Host signals battle end → guest mirrors it
      if (battleEndData && this._inBattle && this._battleHostId !== null) {
        this.systems.battle.combatants  = [];
        this.systems.battle.pendingJoin = [];
        this.systems.battle.state       = 'idle';
        // If host lost but guest's own player is still alive, treat as a flee (party defeated, but we survive)
        let guestOutcome = battleEndData.outcome;
        if (guestOutcome === 'lose' && !this.localPlayer.stats?.isDead) guestOutcome = 'flee';
        this._endBattle({ outcome: guestOutcome });
      }
    };

    this.network.onConnect = () => this.network.requestCharList();
    this.network.connect('default');
  }

  _update(dt) {
    this.input.flush();

    // ── Block game until character is selected ──
    if (!this._charLoaded) {
      this._charSelectUI.update(dt);
      return;
    }

    // ── Death screen ──
    if (this._isDead) {
      this._deathTimer += dt;
      if (this._deathTimer > 1.5 && (this.input.pressed('Enter') || this.input.pressed('Space') || this.input.pressed('KeyR'))) {
        this._respawn();
      }
      return;
    }

    // ── Auto-save every 90 s (major moments save sooner via events) ──
    this._saveTimer += dt;
    if (this._saveTimer >= 90) { this._saveTimer = 0; this._saveChar(); }

    const zone = this.world.current;
    if (!zone) return;

    // ── Continuous entity sync (5 Hz) — runs always so peers see HP during battle too ──
    this._entitySyncTimer += dt;
    if (this._entitySyncTimer >= 0.2) {
      this._entitySyncTimer = 0;
      this._sendEntitySnapshot();
    }

    // ── Battle mode: delegate to BattleSystem, skip most overworld systems ──
    if (this._inBattle) {
      this.ui.handleInput(this.input, this.localPlayer, this.systems.dialogue, this.systems.quest, this);

      // Notify once when player is KO'd but allies still fight
    if (!this._koInBattle && this.localPlayer.stats?.isDead) {
      this._koInBattle = true;
      this.events.emit(EVENTS.NOTIFICATION, { text: "KO'd! Allies fight on...", color: '#ff4444' });
    }

    if (this._battleHostId === null) {
        // HOST: run authoritative BattleSystem
        const prevWaiting = this.systems.battle._waitingForNetworkId;
        this.systems.battle.update(dt);
        // Broadcast state to guests at 10 Hz + immediately when remote player's turn starts
        const hasRemotePeers = this.systems.battle.combatants.some(c => c.isRemotePlayer);
        if (hasRemotePeers && this.network.isConnected) {
          this._battleSyncTimer += dt;
          const turnChanged = this.systems.battle._waitingForNetworkId !== prevWaiting;
          if (turnChanged || this._battleSyncTimer >= 0.1) {
            this._battleSyncTimer = 0;
            this.network.sendEntitySync({ battleState: this.systems.battle.serializeState() });
          }
        }
      } else {
        // GUEST: only positional animations — AV/turns driven by host broadcasts
        this.systems.battle.updateGuest(dt);
      }
      // During move phase: let player WASD through; otherwise block WASD (pass [])
      const movePlayers = this.systems.battle.inMoveMode ? [this.localPlayer] : [];
      this.systems.movement.update(dt, zone, movePlayers);
      if (this.systems.battle.inMoveMode) this.systems.battle.trackMove(this.localPlayer);
      for (const e of zone.entities) e.update(dt);
      this.camera.follow(this.localPlayer);
      this.camera.update(dt, zone.tileMap.pixelWidth(), zone.tileMap.pixelHeight());
      this.ui.update(dt, this.localPlayer);
      if (this._zoneNameTimer > 0) this._zoneNameTimer -= dt;
      return;
    }

    // ── UI input (may block game input) ──
    this.ui.handleInput(this.input, this.localPlayer, this.systems.dialogue, this.systems.quest, this);

    const modalOpen = this.ui.isModalOpen;

    // ── E to interact / open doors ──
    if (!modalOpen && this.input.pressed('KeyE')) {
      const talked = this.systems.dialogue.tryInteract(this.localPlayer, zone, this.systems.quest);
      if (!talked) {
        this._tryToggleDoor(zone, this.localPlayer);
      }
    }

    // ── H: cast skill out of combat ──
    // H = heal self; Shift+H = heal next party member with lowest HP
    if (!modalOpen && this.input.pressed('KeyH')) {
      this._useHealSkillOutOfBattle();
    }

    // ── Use item hotbar (Q = use first consumable) ──
    if (!modalOpen && this.input.pressed('KeyQ')) {
      this._useFirstConsumable();
    }

    // ── Movement (blocked when UI is open) ──
    if (!modalOpen) {
      this.systems.movement.update(dt, zone, this._allPlayers);
    } else {
      // Zero velocity when UI open so player stops
      this.localPlayer.vx = 0;
      this.localPlayer.vy = 0;
    }

    // ── Entity updates ──
    for (const e of zone.entities) e.update(dt);

    // ── Game systems ──
    this.systems.ai.update(dt, zone, this._allPlayers);
    if (!modalOpen) {
      this.systems.combat.update(dt, zone, this._allPlayers, this.input);
    }
    this.systems.spawn.update(dt, zone, ENEMY_DB);
    this.systems.schedule.update(dt, zone, this.world);
    this.systems.puzzle.update(dt, zone, zone.entities);
    if (!modalOpen) {
      this.systems.transition.update(dt, zone, this._allPlayers);
    }

    // ── World time ──
    this.world.update(dt);

    // ── Camera ──
    this.camera.follow(this.localPlayer);
    this.camera.update(dt, zone.tileMap.pixelWidth(), zone.tileMap.pixelHeight());
    // Update mouse world coords (divide by render scale to get logical canvas coords first)
    const rs = this.canvas.width / CANVAS_W;
    const mw = this.camera.screenToWorld(this.input.mouse.x / rs, this.input.mouse.y / rs);
    this.input.mouse.worldX = mw.x;
    this.input.mouse.worldY = mw.y;

    // ── UI update ──
    this.ui.update(dt, this.localPlayer);

    // ── Zone name timer ──
    if (this._zoneNameTimer > 0) this._zoneNameTimer -= dt;

    // ── Brawl post-battle timers ──
    if (this._pipSpawnTimer > 0) {
      this._pipSpawnTimer -= dt;
      if (this._pipSpawnTimer <= 0) { this._pipSpawnTimer = -1; this._spawnPip(); }
    }
    if (this._pendingDialogue) {
      this._pendingDialogue.delay -= dt;
      if (this._pendingDialogue.delay <= 0 && !this.systems.dialogue.active) {
        const pd = this._pendingDialogue;
        this._pendingDialogue = null;
        this.events.emit(EVENTS.DIALOGUE_START, { npc: pd.npc, player: this.localPlayer, treeId: pd.treeId });
      }
    }

    // ── Passive regen (out of battle, every 5s) ──
    this._regenTimer += dt;
    if (this._regenTimer >= 5) {
      this._regenTimer = 0;
      const p = this.localPlayer;
      if (p.stats && !p.stats.isDead) {
        p.stats.heal(Math.max(1, Math.floor(p.stats.derived.HP * 0.02)));
        p.stats.restoreMp(Math.max(1, Math.floor(p.stats.derived.MP * 0.04)));
      }
      for (const pm of this._partyMembers.values()) {
        if (pm.stats && !pm.stats.isDead) {
          pm.stats.heal(Math.max(1, Math.floor(pm.stats.derived.HP * 0.02)));
          pm.stats.restoreMp(Math.max(1, Math.floor(pm.stats.derived.MP * 0.04)));
        }
      }
    }

    // ── Party NPC auto-heal (out of combat) ──
    for (const [, npc] of this._partyMembers) {
      const sb = npc.skillBook;
      if (!sb) continue;
      const healEntry = [...sb.skills.entries()].find(([, def]) => def.targetAlly);
      if (!healEntry) continue;
      const [skillId] = healEntry;
      if (sb.isOnCooldown(skillId)) continue;
      // Collect all party members + player as potential targets (include self)
      const allMembers = [this.localPlayer, ...this._partyMembers.values()];
      const target = allMembers.reduce((best, t) => {
        if (!t?.stats || t.stats.isDead) return best;
        const pct = t.stats.current.HP / (t.stats.derived.HP || 1);
        if (pct >= 0.85) return best; // healthy enough, skip
        if (!best) return t;
        return pct < (best.stats.current.HP / (best.stats.derived.HP || 1)) ? t : best;
      }, null);
      if (target) sb.use(skillId, npc, [target], this.events);
    }

    // ── Party invite / zone follow prompts ──
    if (!this.ui.isModalOpen) {
      if (this._pendingPartyInvite && this.input.pressed('KeyY')) {
        this.network.sendPartyAccept(this._pendingPartyInvite.fromId);
        this._pendingPartyInvite = null;
      }
      if (this._pendingPartyInvite && this.input.pressed('KeyN')) {
        this._pendingPartyInvite = null;
        this.events.emit(EVENTS.NOTIFICATION, { text: 'Party invite declined.', color: '#888' });
      }
      if (this._pendingZoneFollow && this.input.pressed('KeyY')) {
        const { zoneId } = this._pendingZoneFollow;
        this._pendingZoneFollow = null;
        this.events.emit(EVENTS.ZONE_TRANSITION, { player: this.localPlayer, toZone: zoneId, toX: null, toY: null });
      }
      if (this._pendingZoneFollow && this.input.pressed('KeyN')) {
        this._pendingZoneFollow = null;
      }
    }

    // ── Network ──
    const partyNpcSnaps = [...this._partyMembers.values()].map(n => ({
      id: n.id, x: Math.round(n.cx), y: Math.round(n.cy),
      hp: n.stats?.current?.HP ?? 0, maxHp: n.stats?.derived?.HP ?? 1,
      name: n.name, facing: n.facing, animState: n.animState,
    }));
    this.network.update(dt, this.localPlayer, partyNpcSnaps);
    if (this.localPlayer) this.localPlayer._zoneId = zone.id;
  }

  _render(alpha) {
    const ctx = this.ctx;
    // Scale render to fill physical canvas (handles DPR and window resize)
    const scaleX = this.canvas.width  / CANVAS_W;
    const scaleY = this.canvas.height / CANVAS_H;
    ctx.save();
    ctx.scale(scaleX, scaleY);
    this.renderer.clear();

    // ── Death screen (rendered over the game world) ──
    if (this._isDead) {
      const zone = this.world.current;
      if (zone) this.renderer.renderZone(zone, alpha, this.localPlayer);
      const penalty = Math.floor((this.localPlayer?.gold ?? 0) * 0.1);
      ctx.fillStyle = 'rgba(60,0,0,0.78)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cc2222';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('YOU HAVE FALLEN', CANVAS_W / 2, CANVAS_H / 2 - 28);
      ctx.fillStyle = '#e6c3c3';
      ctx.font = '10px monospace';
      if (penalty > 0) ctx.fillText(`-${penalty} gold lost`, CANVAS_W / 2, CANVAS_H / 2 - 8);
      if (this._deathTimer > 1.5) {
        ctx.fillStyle = '#e6edf3';
        ctx.fillText('[Enter] / [Space] / [R] to respawn', CANVAS_W / 2, CANVAS_H / 2 + 12);
      } else {
        ctx.fillStyle = '#8b949e';
        ctx.fillText('...', CANVAS_W / 2, CANVAS_H / 2 + 12);
      }
      ctx.textAlign = 'left';
      ctx.restore();
      return;
    }

    // ── Character select screen ──
    if (!this._charLoaded) {
      this._charSelectUI.render(ctx);
      ctx.restore();
      return;
    }

    const zone = this.world.current;
    if (zone) {
      this.renderer.renderZone(zone, alpha, this.localPlayer);
    }

    // Zone name overlay
    if (this._zoneNameTimer > 0) {
      const fade = Math.min(1, this._zoneNameTimer);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ffdd88';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this._zoneName, CANVAS_W / 2, 30);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // UI (wrapped so a render error never leaves the ctx transform broken)
    try {
      this.ui.render(ctx, this.localPlayer, this.systems.quest, this.systems.dialogue, this.camera, this);
    } catch (e) { console.error('UI render error:', e); }

    // Network status
    if (!this.network.isConnected) {
      ctx.fillStyle = 'rgba(255,100,0,0.7)';
      ctx.font = '5px monospace';
      ctx.fillText('OFFLINE', CANVAS_W - 45, 8);
    }

    ctx.restore(); // remove render scale
  }

  async _handleTransition({ player, toZone, toX, toY }) {
    if (player !== this.localPlayer) return;
    const zone = this.world.current;

    // Collect escort followers + party members before removing from zone
    const followers = zone ? zone.entities.filter(e => (e._followPlayer || e._partyMember) && e.active) : [];
    for (const f of followers) zone.removeEntity(f);

    if (zone) zone.removeEntity(this.localPlayer);
    this.localPlayer.active = true; // removeEntity sets active=false; restore it

    // Lazy-load zone definitions
    await this._ensureZoneLoaded(toZone);
    await this.world.loadZone(toZone, z => this._populateZone(z));

    this.localPlayer.x = (toX ?? this.world.current.spawnPoint.x) - this.localPlayer.w / 2;
    this.localPlayer.y = (toY ?? this.world.current.spawnPoint.y) - this.localPlayer.h / 2;
    this.world.current.addEntity(this.localPlayer);

    // Re-add followers near player in new zone
    // Skip abandoned NPCs (_escortReturn); party members always carry through
    for (const f of followers) {
      if (f._escortReturn && !f._partyMember) { f._escortReturn = false; continue; }
      f.active = true;
      f.x = this.localPlayer.x + 20;
      f.y = this.localPlayer.y;
      this.world.current.addEntity(f);
      // Apply destination position if quest completed mid-transition
      if (f._escortDestX != null) {
        f._targetX = f._escortDestX - f.w / 2;
        f._targetY = f._escortDestY - f.h / 2;
        f._escortDestX = null; f._escortDestY = null;
      }
    }

    // Snap camera
    this.camera.x = this.localPlayer.cx - this.camera.viewW / 2;
    this.camera.y = this.localPlayer.cy - this.camera.viewH / 2;

    // Restore saved party NPCs into the new zone
    this._restorePartyNpcs();

    // Save AFTER player position is set in new zone
    if (this._charLoaded) this._saveChar();

    // Reconcile remote players into the newly loaded zone
    for (const rp of this._remotePlayers.values()) {
      if (rp._currentZoneId === toZone) {
        this._moveRemotePlayerToZone(rp, toZone);
      }
    }
  }

  _moveRemotePlayerToZone(rp, zoneId) {
    // Remove from whichever zone currently holds this entity
    for (const zone of this.world._zones.values()) {
      if (zone.entities.includes(rp)) { zone.removeEntity(rp); break; }
    }
    rp.active = true;
    rp._currentZoneId = zoneId;
    const newZone = this.world._zones.get(zoneId);
    if (newZone) newZone.addEntity(rp);
  }

  // Create / update / remove ghost NPC entities for a remote player's party
  _syncRemoteNpcs(ownerId, ownerZoneId, snaps) {
    // Remove any NPCs not present in the latest snapshot
    for (const [key, ghost] of this._remoteNpcs) {
      if (!key.startsWith(`${ownerId}:`)) continue;
      const still = snaps.find(s => `${ownerId}:${s.id}` === key);
      if (!still) {
        for (const zone of this.world._zones.values()) zone.entities.includes(ghost) && zone.removeEntity(ghost);
        this._remoteNpcs.delete(key);
      }
    }
    if (!ownerZoneId) return; // player left — only cleanup needed
    const targetZone = this.world._zones.get(ownerZoneId);
    for (const snap of snaps) {
      const key = `${ownerId}:${snap.id}`;
      let ghost = this._remoteNpcs.get(key);
      if (!ghost) {
        const startX = snap.x - 6, startY = snap.y - 6;
        ghost = new RemoteNPC(ownerId, snap.id, startX, startY);
        this._remoteNpcs.set(key, ghost);
        ghost._ownerZoneId = ownerZoneId;
        if (targetZone) targetZone.addEntity(ghost);
      } else if (ghost._ownerZoneId !== ownerZoneId) {
        // NPC moved zones with their owner
        for (const zone of this.world._zones.values()) zone.entities.includes(ghost) && zone.removeEntity(ghost);
        ghost._ownerZoneId = ownerZoneId;
        if (targetZone) targetZone.addEntity(ghost);
      }
      ghost.applySnap(snap);
    }
  }

  _resetEscortNpc(npcId, reason = 'complete', destX, destY, destDialogue) {
    let npc = this._escortFollowers.get(npcId) ?? null;
    this._escortFollowers.delete(npcId);
    if (!npc) {
      for (const [, zone] of this.world._zones) {
        const e = zone.entities.find(e => e.id === npcId);
        if (e) { npc = e; break; }
      }
    }
    if (!npc) return;

    npc._followPlayer = false;

    if (reason === 'complete') {
      // NPC arrived at destination — update dialogue and set a target position
      if (destDialogue) npc.dialogueTree = destDialogue;
      // Create shop instance if this NPC has a shopId but no shop yet
      if (npc.shopId && SHOP_DB[npc.shopId] && !npc._shopInstance) {
        npc._shopInstance = new Shop(this.events, npc.shopId, SHOP_DB[npc.shopId]);
      }
      // If NPC is already in a zone, move to destination position; otherwise
      // _handleTransition will place them near the player and we set target
      const placed = [...this.world._zones.values()].some(z => z.entities.includes(npc));
      if (placed) {
        if (destX != null) { npc._targetX = destX - npc.w / 2; npc._targetY = destY - npc.h / 2; }
      } else {
        // Mid-transition: store dest so _handleTransition can apply after add
        if (destX != null) { npc._escortDestX = destX; npc._escortDestY = destY; }
      }
      return;
    }

    // reason === 'abandoned': return NPC to home zone
    npc._escortReturn = true; // tells _handleTransition not to carry them
    for (const [zoneId, zone] of this.world._zones) {
      if (zone.entities.includes(npc)) {
        if (npc._homeZoneId && zoneId !== npc._homeZoneId) {
          zone.removeEntity(npc);
          npc.active = true;
          npc.x = npc._homeX ?? npc.x;
          npc.y = npc._homeY ?? npc.y;
          this.world._zones.get(npc._homeZoneId)?.addEntity(npc);
        } else {
          npc.x = npc._homeX ?? npc.x;
          npc.y = npc._homeY ?? npc.y;
          npc._targetX = npc.x;
          npc._targetY = npc.y;
        }
        return;
      }
    }
    // Not in any zone: _escortReturn prevents _handleTransition from re-adding
  }

  async _ensureZoneLoaded(zoneId) {
    if (this.world._defs.has(zoneId)) return;
    // Lazy import zone data
    try {
      const mod = await import(`../data/zones/${zoneId}.js`);
      this.world.registerDef(mod.default);
    } catch {
      console.warn(`Zone data not found: ${zoneId}. Creating empty zone.`);
      this.world.registerDef({
        id: zoneId, name: zoneId, width: 20, height: 20, tileSize: 16,
        ambientLight: 1, spawnPoint: { x: 10*16, y: 10*16 },
        layers: [{ name: 'ground', data: new Array(400).fill(1) }],
        transitions: [], spawns: [], puzzles: [], npcs: [],
      });
    }
  }

  // Dev console helpers
  async teleport(zoneId, x, y) {
    await this._handleTransition({
      player: this.localPlayer,
      toZone: zoneId,
      toX: x ?? this.localPlayer.x,
      toY: y ?? this.localPlayer.y,
    });
  }

  async spawnEnemy(enemyId, x, y) {
    const def = ENEMY_DB[enemyId];
    if (!def) return false;
    const enemy = new Enemy(def, x, y);
    this.world.current?.addEntity(enemy);
    return true;
  }

  _startBattle({ trigger, player, advantage, brawlMode = false }) {
    if (this._inBattle) return; // Already in battle
    if (player !== this.localPlayer) return;

    const zone = this.world.current;
    if (!zone) return;

    if (brawlMode) {
      // Tavern brawl: just the NPC vs player, no auto-resolve, no group pull
      this._currentBrawler = trigger;
      this.systems.battle.startBattle(player, [trigger], advantage, [], true);
      this._inBattle = true;
      return;
    }

    // Collect immediate group (enemies within alertRadius of trigger)
    const immediateGroup = zone.getEntitiesWithTag('enemy').filter(e =>
      e !== trigger && e.active && !e.stats?.isDead &&
      e.distanceTo(trigger) <= (trigger._alertRadius ?? 60)
    );
    const allEnemies = [trigger, ...immediateGroup];

    // Auto-resolve only when player initiates (not ambush) and enemies are trivially weak
    if (advantage !== 'ambush' && BattleSystem.shouldAutoResolve(player, allEnemies)) {
      this.events.emit(EVENTS.NOTIFICATION, { text: 'Auto-resolved! Enemies too weak.', color: '#ffff00' });
      for (const e of allEnemies) {
        e.active = false;
        this.events.emit(EVENTS.ENTITY_DIED, { entity: e, killer: player });
      }
      // BATTLE_START was already emitted by CombatSystem — must emit BATTLE_END to unblock it
      this.events.emit(EVENTS.BATTLE_END, { outcome: 'auto_resolve' });
      return;
    }

    // Collect escort followers + party members to join as allies
    const followerAllies = zone.entities.filter(e => e._followPlayer && e.active && !e.stats?.isDead);
    const partyAllies    = [...this._partyMembers.values()].filter(e => e.active && !e.stats?.isDead && !followerAllies.includes(e));
    // Collect nearby guard NPCs as temporary allies (they engage enemies anyway — join formally)
    const guardAllies = zone.entities.filter(e =>
      e._combatBehavior === 'guard' && e.stats && e.active && !e.stats.isDead &&
      !followerAllies.includes(e) && !partyAllies.includes(e) &&
      e.distanceTo(trigger) <= (e._guardRange ?? 150)
    );
    // Remote party players in the same zone join as allies (they control themselves on their client)
    const remotePartyAllies = [...this._remotePlayers.values()].filter(rp =>
      this._remotePartyIds.has(rp.id) && rp._currentZoneId === zone.id && rp.active
    );
    const allies = [...followerAllies, ...partyAllies, ...guardAllies, ...remotePartyAllies];
    if (guardAllies.length) {
      this.events.emit(EVENTS.NOTIFICATION, { text: `${guardAllies.map(g => g.name).join(', ')} joins the fight!`, color: '#88ccff' });
    }

    // Start turn-based battle (startBattle zeros all velocities)
    this.systems.battle.startBattle(player, allEnemies, advantage, allies, false);
    // Set up host mode
    this._koInBattle = false;
    this._battleHostId = null;
    this._battleSyncTimer = 0;
    this.systems.battle._isHost = true;
    this.systems.battle._myNetworkId = this.network.localId ?? null;
    if (this.systems.battle._playerCombatant) {
      this.systems.battle._playerCombatant.networkId = this.network.localId ?? null;
    }
    this._inBattle = true;

    // Broadcast battle join to party peers in same zone so they auto-join
    if (this.network.isConnected) {
      const enemyNetIds = allEnemies.map(e => e._netId).filter(Boolean);
      if (enemyNetIds.length) {
        this.network.sendEntitySync({ battleJoin: { enemyNetIds, advantage, hostNetworkId: this.network.localId } });
      }
    }

    // Register secondary group (engage radius) as pending joiners
    zone.getEntitiesWithTag('enemy').forEach(e => {
      if (allEnemies.includes(e) || !e.active || e.stats?.isDead) return;
      if (e.distanceTo(trigger) <= (trigger._engageRadius ?? 140)) {
        const dist = e.distanceTo(trigger);
        const engageRadius = trigger._engageRadius ?? 140;
        const joinRate = (1 - dist / engageRadius) * (e.stats?.derived?.SPD ?? 20) * 20;
        this.systems.battle.addPendingJoin(e, joinRate);
      }
    });
  }

  _findEnemyByNetId(netId) {
    return this.world.current?.entities.find(e => e._netId === netId) ?? null;
  }

  _sendEntitySnapshot() {
    if (!this.world.current || !this.network.isConnected) return;
    // Only broadcast when peers are in the same zone
    const hasPeers = [...this._remotePlayers.values()]
      .some(rp => rp._currentZoneId === this.world.current.id);
    if (!hasPeers) return;
    const entities = this.world.current.entities
      .filter(e => e._netId && e.tags?.has('enemy'))
      .map(e => ({
        netId: e._netId,
        x: Math.round(e.x), y: Math.round(e.y),
        hp: e.stats?.current?.HP ?? 0,
        active: e.active,
      }));
    if (entities.length) this.network.sendEntitySync({ entities });
  }

  _joinSharedBattle({ enemyNetIds, advantage, hostNetworkId }) {
    if (this._inBattle || !this.world.current) return;
    const enemies = (enemyNetIds ?? [])
      .map(id => this._findEnemyByNetId(id))
      .filter(e => e?.active && e.tags?.has('enemy'));
    if (!enemies.length) return;

    // Add the host's remote player entity as ally so they appear in the battle scene
    const hostRp = hostNetworkId != null
      ? [...this._remotePlayers.values()].find(rp => rp.id === hostNetworkId)
      : null;
    const allies = hostRp ? [hostRp] : [];

    if (BattleSystem.shouldAutoResolve(this.localPlayer, enemies)) return;

    this.systems.battle.startBattle(this.localPlayer, enemies, advantage ?? 'normal', allies);
    // Set up guest mode
    this._battleHostId = hostNetworkId ?? null;
    this._battleSyncTimer = 0;
    this.systems.battle._isHost = false;
    this.systems.battle._myNetworkId = this.network.localId ?? null;
    if (this.systems.battle._playerCombatant) {
      this.systems.battle._playerCombatant.networkId = this.network.localId ?? null;
    }
    this.systems.battle._onSendAction = (action) => {
      this.network.sendEntitySync({ battleAction: { ...action, networkId: this.network.localId } });
    };
    this._inBattle = true;
    this.events.emit(EVENTS.NOTIFICATION, { text: 'Joined party battle!', color: '#88ccff' });
  }

  _endBattle({ outcome }) {
    // Host: notify guests that battle is over
    if (this._battleHostId === null && this.network.isConnected && this._remotePartyIds.size > 0) {
      this.network.sendEntitySync({ battleEnd: { outcome } });
    }
    this._battleHostId = null;
    this._inBattle = false;
    this._koInBattle = false;

    // Reset encounter flags for all enemies in zone so they can trigger again
    const zone = this.world.current;
    if (zone) {
      for (const e of zone.getEntitiesWithTag('enemy')) {
        e._playerHitFirst = false;
      }
    }

    // Restore knocked-out party members to 1 HP
    for (const pm of this._partyMembers.values()) {
      if (pm.stats && (pm.stats.current.HP ?? 0) < 1) pm.stats.current.HP = 1;
      pm.active = true;
    }

    if (outcome === 'lose') {
      this.localPlayer.stats.current.HP = 0;
      this._isDead = true;
      this._deathTimer = 0;
      return; // skip post-battle save; respawn will save
    } else if (outcome === 'flee') {
      this.events.emit(EVENTS.NOTIFICATION, { text: 'Fled from battle!', color: '#ffaa00' });
    } else if (outcome === 'win') {
      this.events.emit(EVENTS.NOTIFICATION, { text: 'Battle won!', color: '#88ff88' });
    } else if (outcome === 'win_brawl') {
      this._handleBrawlWin();
    } else if (outcome === 'draw_brawl') {
      this._handleBrawlDraw();
    } else if (outcome === 'lose_brawl') {
      this._handleBrawlLose();
    }
    // Save after every battle resolution (XP, gold, HP all settled)
    if (this._charLoaded) this._saveChar();
  }

  _handleBrawlWin() {
    this.events.emit(EVENTS.NOTIFICATION, { text: 'Rogan is down! A thief moves in...', color: '#ffcc44' });
    if (this._currentBrawler) {
      this._currentBrawler.dialogueTree = 'tavern_brawler_ko';
      this._currentBrawler._followPlayer = false;
    }
    // Nara was watching — she's now recruitable
    const zone = this.world.current;
    const nara = zone?.entities.find(e => e.id === 'party_healer' && !e._partyMember);
    if (nara) nara.dialogueTree = 'party_healer_meet';
    this._pipSpawnTimer = 2; // Pip approaches after 2 seconds
  }

  _handleBrawlDraw() {
    this.events.emit(EVENTS.NOTIFICATION, { text: 'A tough fight! Rogan seems impressed.', color: '#88ffcc' });
    if (this._currentBrawler) {
      this._pendingDialogue = { npc: this._currentBrawler, treeId: 'tavern_brawler_draw', delay: 1.5 };
    }
    // Both Pip and Nara are now recruitable
    const zone = this.world.current;
    const pip  = zone?.entities.find(e => e.id === 'tavern_thief'  && !e._partyMember);
    const nara = zone?.entities.find(e => e.id === 'party_healer'  && !e._partyMember);
    if (pip)  pip.dialogueTree  = 'tavern_thief_default';
    if (nara) nara.dialogueTree = 'party_healer_meet';
  }

  _handleBrawlLose() {
    const stolen = 15 + Math.floor(Math.random() * 16); // 15–30 gold
    this.localPlayer.gold = Math.max(0, (this.localPlayer.gold ?? 0) - stolen);
    this.localPlayer.stats.current.HP = 1;
    // Move player to inn bed
    this.localPlayer.x = 24 * 16 - this.localPlayer.w / 2;
    this.localPlayer.y = 11 * 16 - this.localPlayer.h / 2;
    this.events.emit(EVENTS.NOTIFICATION, { text: `You wake up... ${stolen} gold missing.`, color: '#ff8888' });
    // Reuse existing Nara from zone (she's already in the inn); create only if absent
    const zone = this.world.current;
    let nara = zone?.entities.find(e => e.id === 'party_healer' && !e._partyMember);
    if (!nara) {
      nara = this._createNPC('party_healer', 25 * 16, 11 * 16);
      if (nara) zone?.addEntity(nara);
    }
    if (nara) {
      nara.x = 25 * 16 - nara.w / 2;
      nara.y = 11 * 16 - nara.h / 2;
      this._pendingDialogue = { npc: nara, treeId: 'party_healer_default', delay: 2 };
    }
    // Pip also becomes recruitable after you've been beaten
    const pip = zone?.entities.find(e => e.id === 'tavern_thief' && !e._partyMember);
    if (pip) pip.dialogueTree = 'tavern_thief_default';
  }

  _spawnPip() {
    const brawler = this._currentBrawler;
    const zone = this.world.current;
    if (!zone) return;
    const px = brawler ? brawler.x + 16 : this.localPlayer.x + 32;
    const py = brawler ? brawler.y      : this.localPlayer.y;
    // Reuse existing Pip from zone if already there (avoid duplicates)
    let pip = zone.entities.find(e => e.id === 'tavern_thief' && !e._partyMember);
    if (!pip) {
      pip = this._createNPC('tavern_thief', px, py);
      if (pip) zone.addEntity(pip);
    }
    if (pip) {
      pip.x = px; pip.y = py;
      this._pendingDialogue = { npc: pip, treeId: 'tavern_thief_default', delay: 0.5 };
    }
  }

  _createNPC(id, x, y) {
    const def = NPC_DB[id];
    if (!def) return null;
    const npc = new NPC(def, x, y);
    if (def.combatStats) {
      npc.stats = new StatBlock(def.combatStats);
      npc.stats.recalc();
      npc.stats.current.HP = npc.stats.derived.HP;
      npc.stats.current.MP = npc.stats.derived.MP ?? 0;
    }
    if (def.shopId && SHOP_DB[def.shopId]) {
      npc._shopInstance = new Shop(this.events, def.shopId, SHOP_DB[def.shopId]);
    }
    return npc;
  }

  _addPartyMember(npc) {
    if (!npc || this._partyMembers.has(npc.id)) return;
    npc._followPlayer = true;
    npc._partyMember  = true;
    // Record home location for dismiss
    if (!npc._homeZoneId) {
      npc._homeZoneId = this.world.current?.id;
      npc._homeX = npc.x;
      npc._homeY = npc.y;
    }
    this._partyMembers.set(npc.id, npc);
    // Update their dialogue tree to joined variant
    const joinedTree = `${npc.dialogueTree.replace('_default', '')}_joined`;
    npc.dialogueTree = joinedTree;
    // Give healer-type party members a SkillBook with heal
    if (npc.sprite === 'healer' && !npc.skillBook) {
      npc.skillBook = new SkillBook();
      npc.skillBook.register('heal', {
        name: 'Heal', mpCost: 0, cooldown: 6, avCost: 400, targetAlly: true,
        execute: (_caster, targets, events) => {
          const healTarget = targets[0] ?? _caster;
          const amount = Math.floor((healTarget.stats?.derived?.HP ?? 30) * 0.35);
          healTarget.stats?.heal(amount);
          events.emit(EVENTS.NOTIFICATION, { text: `+${amount} HP → ${healTarget.name}`, color: '#00ffcc' });
        },
      });
    }
    this.events.emit(EVENTS.NOTIFICATION, { text: `${npc.name} joined your party!`, color: '#88ff88' });
  }

  _restorePartyNpcs() {
    if (!this._savedPartyNpcs.length) return;
    const zone = this.world.current;
    const px   = (this.localPlayer?.x ?? 0) + 24;
    const py   = (this.localPlayer?.y ?? 0);
    for (const npcId of this._savedPartyNpcs) {
      if (this._partyMembers.has(npcId)) continue;
      // Check if already spawned in zone by zone def
      let npc = zone?.entities.find(e => e.id === npcId && !e._partyMember);
      if (!npc) {
        npc = this._createNPC(npcId, px, py);
        if (npc) zone?.addEntity(npc);
      }
      if (npc) {
        npc.x = px; npc.y = py;
        this._addPartyMember(npc);
      }
    }
    this._savedPartyNpcs = [];
  }

  _dismissPartyMember(npc) {
    if (!npc || !this._partyMembers.has(npc.id)) return;
    this._partyMembers.delete(npc.id);
    npc._followPlayer = false;
    npc._partyMember  = false;
    // Restore original dialogue tree
    const def = NPC_DB[npc.id];
    npc.dialogueTree = def?.dialogueTree ?? `${npc.id}_default`;
    // Send them home
    const homeZone = npc._homeZoneId;
    if (homeZone && homeZone !== this.world.current?.id) {
      this.world.current?.removeEntity(npc);
      npc.active = true;
      npc.x = npc._homeX ?? npc.x;
      npc.y = npc._homeY ?? npc.y;
      this.world._zones.get(homeZone)?.addEntity(npc);
    } else if (npc._homeX != null) {
      npc._targetX = npc._homeX;
      npc._targetY = npc._homeY;
    }
    this.events.emit(EVENTS.NOTIFICATION, { text: `${npc.name} left your party.`, color: '#aaaaff' });
    if (this._charLoaded) this._saveChar();
  }

  _useHealSkillOutOfBattle() {
    const player = this.localPlayer;
    const sb = player.skillBook;
    if (!sb) return;

    // Find any heal-type skill (targetAlly: true or named 'heal')
    const healEntry = [...sb.skills.entries()].find(([, def]) => def.targetAlly || def.name?.toLowerCase().includes('heal'));
    if (!healEntry) { this.events.emit(EVENTS.NOTIFICATION, { text: 'No heal skill available.', color: '#888' }); return; }
    const [skillId, def] = healEntry;

    if (sb.isOnCooldown(skillId)) {
      this.events.emit(EVENTS.NOTIFICATION, { text: `${def.name} on cooldown!`, color: '#ff8888' }); return;
    }
    if ((player.stats.current.MP ?? 0) < (def.mpCost ?? 0)) {
      this.events.emit(EVENTS.NOTIFICATION, { text: 'Not enough MP!', color: '#ff8888' }); return;
    }

    // Target: party member with lowest HP% if any are wounded, otherwise self
    const partyArr = [...this._partyMembers.values()].filter(pm => pm.active && pm.stats && !pm.stats.isDead);
    const wounded = partyArr.reduce((best, pm) => {
      const pct = pm.stats.current.HP / (pm.stats.derived.HP || 1);
      const selfPct = (player.stats.current.HP ?? 0) / (player.stats.derived.HP || 1);
      if (!best) return pct < selfPct ? pm : null;
      return pct < (best.stats.current.HP / (best.stats.derived.HP || 1)) ? pm : best;
    }, null);

    const target = wounded ?? player;
    sb.use(skillId, player, [target], this.events);
  }

  _grantPartyMemberXP(npc, amount) {
    if (!npc._level) { npc._level = 1; npc._xp = 0; npc._xpToNext = 100; }
    npc._xp += amount;
    while (npc._xp >= npc._xpToNext) {
      npc._xp -= npc._xpToNext;
      npc._level++;
      npc._xpToNext = Math.floor(100 * Math.pow(npc._level, 1.5));
      npc.stats.base.STR += 1;
      npc.stats.base.CON += 1;
      npc.stats.base.DEX += 1;
      npc.stats.recalc();
      this.events.emit(EVENTS.NOTIFICATION, { text: `${npc.name} leveled up! (Lv.${npc._level})`, color: '#ffff44' });
    }
  }

  _tryToggleDoor(zone, player) {
    const tileMap = zone.tileMap;
    const ts = tileMap.tileSize;
    // Check the 4 adjacent tiles for a door
    const cx = Math.floor((player.cx) / ts);
    const cy = Math.floor((player.cy) / ts);
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const tx = cx + dx, ty = cy + dy;
      const id = tileMap.getTile('objects', tx, ty);
      if (id === TILE.DOOR_CLOSED) {
        tileMap.setTile('objects', tx, ty, TILE.DOOR_OPEN);
        tileMap.setWalkable(tx, ty, true);
        return true;
      } else if (id === TILE.DOOR_OPEN) {
        tileMap.setTile('objects', tx, ty, TILE.DOOR_CLOSED);
        tileMap.setWalkable(tx, ty, false);
        return true;
      }
    }
    return false;
  }

  _useFirstConsumable() {
    const inv = this.localPlayer.inventory;
    if (!inv) return;
    for (let i = 0; i < inv.slots.length; i++) {
      const item = inv.slots[i];
      if (!item || item.type !== 'consumable' || !item.effect) continue;
      const eff = item.effect;
      if (eff.type === 'heal') {
        this.localPlayer.stats.heal(eff.amount);
        this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} HP`, color: '#0c0' });
      } else if (eff.type === 'mp_restore') {
        this.localPlayer.stats.restoreMp(eff.amount);
        this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} MP`, color: '#44f' });
      }
      inv.remove(i, 1);
      return;
    }
  }
}
