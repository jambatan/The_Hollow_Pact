import { EVENTS } from '../../shared/constants.js';

export class DialogueSystem {
  constructor(events) {
    this.events = events;
    this.active = false;
    this.currentNode = null;
    this.currentNPC  = null;
    this.currentPlayer = null;
    this._tree = null;

    events.on(EVENTS.DIALOGUE_START, this._start.bind(this));
    events.on(EVENTS.DIALOGUE_END, this._end.bind(this));
  }

  _start({ npc, player, treeId }) {
    this.active = true;
    this.currentNPC    = npc;
    this.currentPlayer = player;

    // Lazy-load dialogue trees
    import('../data/dialogue/index.js').then(({ DIALOGUE_DB }) => {
      this._tree = DIALOGUE_DB[treeId] ?? null;
      if (this._tree) {
        this.currentNode = this._resolveNode(this._tree.nodes[this._tree.root], player);
      } else {
        this.currentNode = {
          speaker: npc.name, text: '...', choices: [{ text: 'Goodbye.', action: 'close' }]
        };
      }
    });
  }

  _end() {
    this.active = false;
    this.currentNode = null;
    this.currentNPC  = null;
    this.currentPlayer = null;
    this._tree = null;
  }

  selectChoice(index, questSystem) {
    const choice = this.currentNode?.choices[index];
    if (!choice) return;

    switch (choice.action) {
      case 'close':
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
      case 'goto':
        this.currentNode = this._resolveNode(this._tree.nodes[choice.target], this.currentPlayer);
        break;
      case 'open_shop': {
        const merchant = this.currentNPC;
        const player   = this.currentPlayer;
        this.events.emit(EVENTS.DIALOGUE_END);
        this.events.emit(EVENTS.SHOP_OPEN, { merchant, player });
        break;
      }
      case 'rest': {
        const cost = 10;
        if (this.currentPlayer.gold >= cost) {
          this.currentPlayer.gold -= cost;
          this.currentPlayer.stats.current.HP = this.currentPlayer.stats.derived.HP;
          this.currentPlayer.stats.current.MP = this.currentPlayer.stats.derived.MP;
          this.events.emit(EVENTS.NOTIFICATION, { text: 'Rested! HP/MP restored.', color: '#88ff88' });
        } else {
          this.events.emit(EVENTS.NOTIFICATION, { text: 'Not enough gold!', color: '#ff8888' });
        }
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
      }
      case 'quest_offer':
        if (questSystem) questSystem.offer(choice.questId, this.currentNPC, this.currentPlayer, this.events);
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
      case 'quest_check':
        if (questSystem) {
          const handled = questSystem.tryAdvance(choice.questId, this.currentPlayer, this.events);
          if (!handled) {
            // Not ready — just close
          }
        }
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
      case 'start_brawl': {
        // Capture refs before DIALOGUE_END nulls them
        const brawlNpc    = this.currentNPC;
        const brawlPlayer = this.currentPlayer;
        this.events.emit(EVENTS.DIALOGUE_END);
        this.events.emit(EVENTS.BATTLE_START, {
          trigger: brawlNpc,
          player:  brawlPlayer,
          advantage: 'normal',
          brawlMode: true,
        });
        break;
      }
      case 'join_party': {
        const joinNpc    = this.currentNPC;
        const joinPlayer = this.currentPlayer;
        this.events.emit(EVENTS.PARTY_JOINED, { npc: joinNpc, player: joinPlayer });
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
      }
      // Change another NPC's dialogue tree by npcId; then goto target or close
      case 'set_npc_dialogue':
        this.events.emit(EVENTS.NPC_TREE_SET, { npcId: choice.npcId, treeId: choice.treeId });
        if (choice.target) {
          this.currentNode = this._resolveNode(this._tree.nodes[choice.target], this.currentPlayer);
        } else {
          this.events.emit(EVENTS.DIALOGUE_END);
        }
        break;
      // Vouch for Pip and Nara simultaneously (Rogan's joined dialogue)
      case 'vouch_others':
        this.events.emit(EVENTS.NPC_TREE_SET, { npcId: 'tavern_thief',  treeId: 'tavern_thief_default' });
        this.events.emit(EVENTS.NPC_TREE_SET, { npcId: 'party_healer',  treeId: 'party_healer_meet' });
        this.events.emit(EVENTS.NOTIFICATION, { text: 'Rogan vouched for Pip and Nara.', color: '#88ffcc' });
        this.events.emit(EVENTS.DIALOGUE_END);
        break;
    }
  }

  // Player presses E near NPC
  tryInteract(player, zone, questSystem) {
    if (this.active) return false;
    for (const entity of zone.entities) {
      if (!entity.tags.has('npc')) continue;
      if (entity._followPlayer) continue; // skip followers — they block doors
      if (entity.distanceTo(player) > 28) continue;

      const treeId = entity.dialogueTree;
      this.events.emit(EVENTS.DIALOGUE_START, { npc: entity, player, treeId });
      return true;
    }
    return false;
  }

  _resolveNode(node, player) {
    if (!node) return null;
    const choices = (node.choices ?? []).filter(c => !c.condition || c.condition(player));
    // Substitute null speaker with the current NPC's name
    const speaker = node.speaker ?? this.currentNPC?.name ?? '???';
    return { ...node, speaker, choices };
  }
}
