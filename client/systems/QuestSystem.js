import { EVENTS } from '../../shared/constants.js';
import { ItemFactory } from '../inventory/ItemFactory.js';

export class QuestSystem {
  constructor(events, questDB, getPlayer = () => null) {
    this.events     = events;
    this.questDB    = questDB;
    this._getPlayer = getPlayer;
    this.active    = new Map(); // questId → { def, stage, progress }
    this.completed = new Set();
    this.trackedIds = new Set(); // up to 3 quest IDs shown on HUD

    // Listen to domain events to auto-advance quest objectives
    events.on(EVENTS.ENTITY_DIED,   this._onKill.bind(this));
    events.on(EVENTS.ITEM_ACQUIRED, this._onItemGet.bind(this));
    events.on(EVENTS.ZONE_CHANGED,  this._onZoneChange.bind(this));
    events.on(EVENTS.PUZZLE_SOLVED, this._onPuzzle.bind(this));
  }

  toggleTracked(questId) {
    if (this.trackedIds.has(questId)) {
      this.trackedIds.delete(questId);
    } else if (this.trackedIds.size < 3) {
      this.trackedIds.add(questId);
    }
  }

  // NPC offers a quest
  offer(questId, npc, player, events) {
    if (this.active.has(questId) || this.completed.has(questId)) return;
    const def = this.questDB[questId];
    if (!def) return;
    this.active.set(questId, { def, stage: 0, progress: {} });
    if (this.trackedIds.size < 3) this.trackedIds.add(questId); // auto-track new quests
    events.emit(EVENTS.QUEST_UPDATED, { questId, status: 'accepted' });
    events.emit(EVENTS.NOTIFICATION, { text: `Quest accepted: ${def.name}`, color: '#ffdd88' });
  }

  // Check if quest stage can advance (called via dialogue)
  tryAdvance(questId, player, events) {
    const state = this.active.get(questId);
    if (!state) return false;
    const def = state.def;
    const stage = def.stages[state.stage];
    if (!stage) return false;

    // Check if objectives are met
    if (this._stageComplete(state, stage, player)) {
      this._completeStage(questId, state, stage, player, events);
      return true;
    }
    return false;
  }

  _stageComplete(state, stage, player) {
    const p = player ?? this._getPlayer();
    for (const obj of stage.objectives) {
      switch (obj.type) {
        case 'kill': {
          // Support single enemyId or array of enemyIds (any count toward total)
          const key = obj.enemyIds ? obj.enemyIds.join(',') : obj.enemyId;
          if ((state.progress[key] ?? 0) < obj.count) return false;
          break;
        }
        case 'fetch':
          if (!p?.inventory?.hasItem(obj.itemId, obj.count ?? 1)) return false;
          break;
        case 'reach':
          // Handled by _onZoneChange
          if (!state.progress[`zone_${obj.zoneId}`]) return false;
          break;
        case 'puzzle':
          if (!state.progress[`puzzle_${obj.puzzleId}`]) return false;
          break;
        case 'talk':
          if (!state.progress[`talk_${obj.npcId}`]) return false;
          break;
      }
    }
    return true;
  }

  _completeStage(questId, state, stage, playerArg, events) {
    const player = playerArg ?? this._getPlayer();
    // Grant stage rewards
    if (stage.reward && player) {
      if (stage.reward.gold) {
        player.gold += stage.reward.gold;
        events?.emit(EVENTS.NOTIFICATION, { text: `+${stage.reward.gold}g`, color: '#f1c40f' });
      }
      if (stage.reward.xp) {
        player.gainXP(stage.reward.xp);
        events?.emit(EVENTS.NOTIFICATION, { text: `+${stage.reward.xp} XP`, color: '#88ff88' });
      }
      if (stage.reward.items) {
        for (const [id, qty] of Object.entries(stage.reward.items)) {
          const item = ItemFactory.create(id, qty);
          if (item) player.inventory?.add(item);
        }
      }
      // Remove fetch items
      for (const obj of stage.objectives) {
        if (obj.type === 'fetch') {
          player.inventory?.removeById(obj.itemId, obj.count ?? 1);
        }
      }
    }

    // Stop any escort NPC following for this stage before advancing
    if (stage.escortNpcId) {
      events?.emit(EVENTS.ESCORT_RESET, {
        questId, npcId: stage.escortNpcId, reason: 'complete',
        destX: stage.escortDestX, destY: stage.escortDestY,
        destDialogue: stage.escortDestDialogue,
      });
    }

    state.stage++;
    if (state.stage >= state.def.stages.length) {
      // Quest complete
      this.active.delete(questId);
      this.completed.add(questId);
      this.trackedIds.delete(questId);
      events?.emit(EVENTS.QUEST_COMPLETED, { questId });
      events?.emit(EVENTS.QUEST_UPDATED, { questId, status: 'completed' });
      events?.emit(EVENTS.NOTIFICATION, { text: `Quest complete: ${state.def.name}!`, color: '#ffffaa' });
    } else {
      state.progress = {};
      events?.emit(EVENTS.QUEST_UPDATED, { questId, status: 'stage_advanced' });
    }
  }

  // Event listeners
  _onKill({ entity, killer }) {
    // Credit player kills and party ally kills equally
    const creditedToPlayer = killer?.tags?.has('player') || killer?._partyMember || killer?._followPlayer;
    if (!creditedToPlayer) return;
    for (const [questId, state] of this.active) {
      const stage = state.def.stages[state.stage];
      for (const obj of stage?.objectives ?? []) {
        if (obj.type !== 'kill') continue;
        // Support single enemyId or array enemyIds
        const ids = obj.enemyIds ?? (obj.enemyId ? [obj.enemyId] : []);
        if (!ids.includes(entity.defId)) continue;
        const key = obj.enemyIds ? obj.enemyIds.join(',') : obj.enemyId;
        state.progress[key] = (state.progress[key] ?? 0) + 1;
        const current = state.progress[key];
        this.events.emit(EVENTS.QUEST_UPDATED, { questId, progress: { [key]: current } });
        this.events.emit(EVENTS.NOTIFICATION, { text: `${entity.name} slain (${current}/${obj.count})`, color: '#ffccaa' });
        // Auto-advance if all objectives complete
        if (this._stageComplete(state, stage, null)) {
          this._completeStage(questId, state, stage, null, this.events);
        }
      }
    }
  }

  _onItemGet({ itemId, quantity }) {
    for (const [questId, state] of this.active) {
      const stage = state.def.stages[state.stage];
      for (const obj of stage?.objectives ?? []) {
        if (obj.type === 'fetch' && obj.itemId === itemId) {
          this.events.emit(EVENTS.QUEST_UPDATED, { questId });
        }
      }
    }
  }

  _onZoneChange({ zone }) {
    for (const [questId, state] of this.active) {
      const stage = state.def.stages[state.stage];
      if (!stage) continue;

      // Mark reach objectives
      for (const obj of stage.objectives ?? []) {
        if (obj.type === 'reach' && obj.zoneId === zone.id) {
          state.progress[`zone_${zone.id}`] = true;
          this.events.emit(EVENTS.QUEST_UPDATED, { questId });
          if (this._stageComplete(state, stage, null)) {
            this._completeStage(questId, state, stage, null, this.events);
          }
        }
      }

      // Escort off-route tracking
      if (stage.escortNpcId && stage.allowedZones?.length) {
        if (!stage.allowedZones.includes(zone.id)) {
          const limit = stage.offRouteLimit ?? 3;
          state.progress._offRouteCount = (state.progress._offRouteCount ?? 0) + 1;
          const count = state.progress._offRouteCount;
          if (count >= limit) {
            state.progress._offRouteCount = 0;
            this.events.emit(EVENTS.ESCORT_RESET, { questId, npcId: stage.escortNpcId, reason: 'abandoned' });
            // Abandoned: use a final dialogue warning
            this.events.emit(EVENTS.ESCORT_WARNING, {
              npcId: stage.escortNpcId, count, limit, abandoned: true,
              npcName: stage.escortNpcName ?? 'Your Escort',
            });
          } else {
            // Off-route but not yet abandoned — open dialogue warning
            this.events.emit(EVENTS.ESCORT_WARNING, {
              npcId: stage.escortNpcId, count, limit, abandoned: false,
              npcName: stage.escortNpcName ?? 'Your Escort',
            });
          }
        } else {
          // Back on route — reset off-route count
          state.progress._offRouteCount = 0;
        }
      }
    }
  }

  _onPuzzle({ puzzleId }) {
    for (const [questId, state] of this.active) {
      const stage = state.def.stages[state.stage];
      for (const obj of stage?.objectives ?? []) {
        if (obj.type === 'puzzle' && obj.puzzleId === puzzleId) {
          state.progress[`puzzle_${puzzleId}`] = true;
          this.events.emit(EVENTS.QUEST_UPDATED, { questId });
        }
      }
    }
  }

  // For HUD — quest indicator above NPCs
  hasQuestFor(npcId) {
    for (const [, state] of this.active) {
      const stage = state.def.stages[state.stage];
      if (stage?.npcId === npcId) return 'active';
    }
    for (const [qId] of Object.entries(this.questDB)) {
      if (!this.active.has(qId) && !this.completed.has(qId)) {
        if (this.questDB[qId].giverNpcId === npcId) return 'available';
      }
    }
    return null;
  }

  getActiveQuests() {
    return [...this.active.entries()].map(([id, state]) => ({ id, ...state }));
  }
}
