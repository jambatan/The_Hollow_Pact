import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

// Action menu structure
const MAIN_MENU = ['Attack', 'Skills', 'Items', 'Move', 'Flee'];

export class BattleUI {
  constructor(events) {
    this.events = events;
    this._menuIdx    = 0;  // index in current menu
    this._subMenu    = null; // null | 'skills' | 'items' | 'move'
    this._subIdx     = 0;
    this._arcAngle   = 0;  // for arc skill targeting (radians)
    this._arcSkillId = null;
  }

  handleInput(input, battleSystem) {
    if (!battleSystem || battleSystem.state !== 'waiting_input') return;
    if (battleSystem.isWaitingForOther) return; // remote player's turn, block local input

    // Ally target mode (for heal-type skills)
    if (this._subMenu === 'ally_target') {
      const friendlies = this._getAllyTargetList(battleSystem);
      if (input.pressed('ArrowUp'))   this._allyTargetIdx = Math.max(0, (this._allyTargetIdx ?? 0) - 1);
      if (input.pressed('ArrowDown')) this._allyTargetIdx = Math.min(friendlies.length - 1, (this._allyTargetIdx ?? 0) + 1);
      if (input.pressed('Escape')) { this._subMenu = 'skills'; return; }
      if (input.pressed('Space') || input.pressed('Enter')) {
        battleSystem.executePlayerAction('skill', { skillId: this._arcSkillId, allyIdx: this._allyTargetIdx ?? 0 });
        this._subMenu = null;
        this._arcSkillId = null;
      }
      return;
    }

    // Arc targeting mode
    if (this._subMenu === 'arc') {
      if (input.pressed('ArrowLeft'))  this._arcAngle -= Math.PI / 8;
      if (input.pressed('ArrowRight')) this._arcAngle += Math.PI / 8;
      if (input.pressed('Space') || input.pressed('Enter')) {
        battleSystem.executePlayerAction('skill', { skillId: this._arcSkillId, arc: true, facingAngle: this._arcAngle });
        this._subMenu = null;
        this._arcSkillId = null;
      }
      if (input.pressed('Escape')) { this._subMenu = 'skills'; }
      return;
    }

    // Sub-menus
    if (this._subMenu === 'skills') {
      const skills = this._getSkillList(battleSystem);
      if (input.pressed('ArrowUp'))   this._subIdx = Math.max(0, this._subIdx - 1);
      if (input.pressed('ArrowDown')) this._subIdx = Math.min(skills.length, this._subIdx + 1);
      if (input.pressed('Escape'))    { this._subMenu = null; return; }
      if (input.pressed('Space') || input.pressed('Enter')) {
        if (this._subIdx === skills.length) { this._subMenu = null; return; } // Back
        const skill = skills[this._subIdx];
        if (skill) {
          if (skill.def.arc) {
            this._subMenu = 'arc';
            this._arcSkillId = skill.id;
            this._arcAngle = 0;
          } else if (skill.def.targetAlly) {
            // Switch to ally target selection mode
            this._subMenu = 'ally_target';
            this._arcSkillId = skill.id; // reuse field for pending skill id
            this._allyTargetIdx = 0;
          } else {
            battleSystem.executePlayerAction('skill', { skillId: skill.id });
            this._subMenu = null;
          }
        }
      }
      return;
    }

    if (this._subMenu === 'items') {
      const items = this._getItemList(battleSystem);
      if (input.pressed('ArrowUp'))   this._subIdx = Math.max(0, this._subIdx - 1);
      if (input.pressed('ArrowDown')) this._subIdx = Math.min(items.length, this._subIdx + 1);
      if (input.pressed('Escape'))    { this._subMenu = null; return; }
      if (input.pressed('Space') || input.pressed('Enter')) {
        if (this._subIdx === items.length) { this._subMenu = null; return; } // Back
        const item = items[this._subIdx];
        if (item) {
          battleSystem.executePlayerAction('item', { itemIdx: item.slotIdx });
          this._subMenu = null;
        }
      }
      return;
    }

    if (this._subMenu === 'move') {
      // Free-move phase: WASD handled by Game.js; Space=confirm, Escape=cancel
      if (input.pressed('Space') || input.pressed('Enter')) {
        battleSystem.confirmMove();
        this._subMenu = null;
        return;
      }
      if (input.pressed('Escape')) {
        battleSystem.cancelMove();
        this._subMenu = null;
        return;
      }
      return; // all other keys passed through to MovementSystem via Game.js
    }

    // Main menu navigation
    if (input.pressed('ArrowUp'))   this._menuIdx = Math.max(0, this._menuIdx - 1);
    if (input.pressed('ArrowDown')) this._menuIdx = Math.min(MAIN_MENU.length - 1, this._menuIdx + 1);

    // Target cycling (left/right when on Attack)
    if (MAIN_MENU[this._menuIdx] === 'Attack') {
      if (input.pressed('ArrowLeft'))  battleSystem.cycleTaret(-1);
      if (input.pressed('ArrowRight')) battleSystem.cycleTaret(1);
    }

    if (input.pressed('Space') || input.pressed('Enter')) {
      this._confirmMainMenu(battleSystem);
    }
  }

  _confirmMainMenu(battleSystem) {
    switch (MAIN_MENU[this._menuIdx]) {
      case 'Attack':
        battleSystem.executePlayerAction('attack');
        break;
      case 'Skills':
        this._subMenu = 'skills';
        this._subIdx  = 0;
        break;
      case 'Items':
        this._subMenu = 'items';
        this._subIdx  = 0;
        break;
      case 'Move':
        battleSystem.executePlayerAction('move');
        this._subMenu = 'move'; // switch to free-move display
        break;
      case 'Flee':
        battleSystem.executePlayerAction('flee');
        break;
    }
  }

  _getSkillList(battleSystem) {
    const sb = battleSystem.playerCombatant?.entity?.skillBook;
    if (!sb) return [];
    return [...sb.skills.entries()].map(([id, def]) => ({
      id,
      def,
      onCooldown: sb.isOnCooldown(id),
    }));
  }

  _getAllyTargetList(battleSystem) {
    const pc = battleSystem.playerCombatant;
    if (!pc) return [];
    const allies = battleSystem.combatants?.filter(c => c.isAlly && c.entity.active !== false && !c.entity.stats?.isDead) ?? [];
    return [pc, ...allies]; // player always first
  }

  _getItemList(battleSystem) {
    const inv = battleSystem.playerCombatant?.entity?.inventory;
    if (!inv) return [];
    const result = [];
    for (let i = 0; i < inv.slots.length; i++) {
      const item = inv.slots[i];
      if (item && item.type === 'consumable') result.push({ item, slotIdx: i });
    }
    return result;
  }

  render(ctx, battleSystem, camera) {
    if (!battleSystem || battleSystem.state === 'idle') return;

    // ── Darken overworld ──
    ctx.fillStyle = 'rgba(0,0,15,0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Turn order bar (top) ──
    this._renderTurnBar(ctx, battleSystem);

    // ── Enemy cards (left panel) ──
    this._renderEnemyPanel(ctx, battleSystem);

    // ── Player/action panel (right) ──
    this._renderPlayerPanel(ctx, battleSystem);

    // ── Arc preview (if aiming arc skill) ──
    if (this._subMenu === 'arc' && camera) {
      this._renderArcPreview(ctx, battleSystem, camera);
    }

    // ── Battle log (bottom center) ──
    this._renderBattleLog(ctx, battleSystem);
  }

  _renderTurnBar(ctx, battleSystem) {
    const bx = 0, by = 0, bw = CANVAS_W, bh = 46;
    ctx.fillStyle = 'rgba(5,5,20,0.9)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#334466';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#aaa';
    ctx.font = '5px monospace';
    ctx.fillText('TURN ORDER', bx + 4, by + 8);

    const order = battleSystem.getTurnOrder(8);
    const iconW = 50, iconH = 32, startX = 70;

    for (let i = 0; i < order.length && i < 8; i++) {
      const entry = order[i];
      const ix = startX + i * (iconW + 4);
      const iy = by + 7;
      const isActive = i === 0 && battleSystem.state === 'waiting_input';

      ctx.fillStyle = isActive ? (entry.isPlayer ? '#224488' : entry.isAlly ? '#224422' : '#442222')
                               : (entry.isPlayer ? '#112244' : entry.isAlly ? '#112211' : '#221111');
      ctx.fillRect(ix, iy, iconW, iconH);
      ctx.strokeStyle = isActive ? '#ffdd00' : (entry.isPlayer ? '#4466aa' : entry.isAlly ? '#44aa44' : '#664444');
      ctx.lineWidth = isActive ? 1.5 : 0.5;
      ctx.strokeRect(ix, iy, iconW, iconH);

      if (entry.pending) {
        // Pending join: show fill bar
        ctx.fillStyle = '#555';
        ctx.fillRect(ix + 2, iy + iconH - 6, iconW - 4, 4);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(ix + 2, iy + iconH - 6, Math.floor((iconW - 4) * (entry.progress ?? 0)), 4);
      }

      ctx.fillStyle = entry.isPlayer ? '#88aaff' : entry.isAlly ? '#88ff88' : '#ff8888';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      const label = entry.isPlayer ? 'You' : (entry.entity.name ?? '?');
      ctx.fillText(label.slice(0, 7), ix + iconW / 2, iy + iconH / 2 + 3);
      ctx.textAlign = 'left';

      if (entry.pending) {
        ctx.fillStyle = '#ff8800';
        ctx.font = '4px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('incoming', ix + iconW / 2, iy + iconH - 8);
        ctx.textAlign = 'left';
      }
    }

    // Chain indicator
    if (battleSystem.isChained) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('CHAIN!', bw - 70, by + 28);
    }
  }

  _renderEnemyPanel(ctx, battleSystem) {
    const px = 10, py = 52, pw = 220, ph = CANVAS_H - 52 - 50;
    ctx.fillStyle = 'rgba(5,5,20,0.85)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#442222';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = '#ff8888';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('Enemies', px + 6, py + 10);

    const enemies = battleSystem.activeEnemyCombatants;
    const cardH = 38;
    for (let i = 0; i < enemies.length; i++) {
      const c = enemies[i];
      const cy = py + 16 + i * (cardH + 4);
      if (cy + cardH > py + ph) break;
      const isTarget = i === battleSystem._targetIdx && battleSystem.state === 'waiting_input';

      ctx.fillStyle = isTarget ? '#331111' : '#1a0808';
      ctx.fillRect(px + 4, cy, pw - 8, cardH);
      ctx.strokeStyle = isTarget ? '#ffdd00' : '#552222';
      ctx.lineWidth = isTarget ? 1 : 0.5;
      ctx.strokeRect(px + 4, cy, pw - 8, cardH);

      // Name
      ctx.fillStyle = isTarget ? '#fff' : '#ccc';
      ctx.font = '6px monospace';
      ctx.fillText(c.entity.name, px + 8, cy + 10);

      // HP bar
      const hpPct = (c.entity.stats?.current?.HP ?? 0) / (c.entity.stats?.derived?.HP ?? 1);
      const barW = pw - 20;
      ctx.fillStyle = '#300';
      ctx.fillRect(px + 8, cy + 14, barW, 6);
      ctx.fillStyle = hpPct > 0.5 ? '#0c0' : hpPct > 0.25 ? '#cc0' : '#c00';
      ctx.fillRect(px + 8, cy + 14, Math.ceil(barW * Math.max(0, hpPct)), 6);
      ctx.fillStyle = '#999';
      ctx.font = '4px monospace';
      ctx.fillText(`${c.entity.stats?.current?.HP ?? 0}/${c.entity.stats?.derived?.HP ?? 0}`, px + 8, cy + 27);

      // AV bar
      const avPct = Math.min(1, c.av / 1000);
      ctx.fillStyle = '#111';
      ctx.fillRect(px + 8, cy + 29, barW, 4);
      ctx.fillStyle = '#448';
      ctx.fillRect(px + 8, cy + 29, Math.ceil(barW * avPct), 4);

      // Stun indicator
      if (c.stunned) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '5px monospace';
        ctx.fillText('[STUN]', px + barW - 30, cy + 10);
      }

      if (isTarget) {
        ctx.fillStyle = '#ffdd00';
        ctx.font = '5px monospace';
        ctx.fillText('◄ TARGET', px + pw - 60, cy + 10);
      }
    }

    // Pending joiners
    const pending = battleSystem.pendingJoin.filter(p => p.entity.active !== false);
    if (pending.length > 0) {
      const py2 = py + 16 + enemies.length * (cardH + 4) + 8;
      ctx.fillStyle = '#664400';
      ctx.font = 'bold 5px monospace';
      ctx.fillText('Incoming:', px + 6, py2);
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        const ey = py2 + 8 + i * 16;
        if (ey + 14 > py + ph) break;
        const pct = p.joinAV / 1000;
        ctx.fillStyle = '#aaa';
        ctx.font = '5px monospace';
        ctx.fillText(p.entity.name, px + 6, ey + 7);
        ctx.fillStyle = '#333';
        ctx.fillRect(px + 60, ey, pw - 70, 6);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(px + 60, ey, Math.ceil((pw - 70) * pct), 6);
      }
    }
  }

  _renderPlayerPanel(ctx, battleSystem) {
    const px = CANVAS_W - 175, py = 52, pw = 165, ph = CANVAS_H - 52 - 50;
    ctx.fillStyle = 'rgba(5,5,20,0.85)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#224422';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, pw, ph);

    const pc = battleSystem.playerCombatant;
    if (!pc) return;
    const st = pc.entity.stats;

    // Player stats
    ctx.fillStyle = '#88aaff';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('You', px + 6, py + 10);

    const barW = pw - 14;
    // HP
    const hpPct = st.current.HP / st.derived.HP;
    ctx.fillStyle = '#300'; ctx.fillRect(px + 6, py + 13, barW, 7);
    ctx.fillStyle = '#0c0'; ctx.fillRect(px + 6, py + 13, Math.ceil(barW * hpPct), 7);
    ctx.fillStyle = '#fff'; ctx.font = '4px monospace';
    ctx.fillText(`HP ${st.current.HP}/${st.derived.HP}`, px + 8, py + 19);
    // MP
    const mpPct = st.current.MP / st.derived.MP;
    ctx.fillStyle = '#003'; ctx.fillRect(px + 6, py + 22, barW, 7);
    ctx.fillStyle = '#44f'; ctx.fillRect(px + 6, py + 22, Math.ceil(barW * mpPct), 7);
    ctx.fillStyle = '#fff';
    ctx.fillText(`MP ${st.current.MP}/${st.derived.MP}`, px + 8, py + 28);
    // AV
    const avPct = Math.min(1, pc.av / 1000);
    ctx.fillStyle = '#111'; ctx.fillRect(px + 6, py + 31, barW, 4);
    ctx.fillStyle = '#88aaff'; ctx.fillRect(px + 6, py + 31, Math.ceil(barW * avPct), 4);
    ctx.fillStyle = '#556'; ctx.font = '4px monospace';
    ctx.fillText('AV', px + 8, py + 37);

    // Ally HP section (compact — 12px per ally)
    const allyCombatants = battleSystem.combatants?.filter(c => c.isAlly && c.entity.active !== false && !c.entity.stats?.isDead) ?? [];
    let allyY = py + 40;
    if (allyCombatants.length) {
      ctx.fillStyle = '#55aa55';
      ctx.font = 'bold 4px monospace';
      ctx.fillText('PARTY', px + 6, allyY + 4);
      allyY += 7;
      for (const ac of allyCombatants) {
        const ahpPct = Math.max(0, (ac.entity.stats?.current?.HP ?? 0) / (ac.entity.stats?.derived?.HP ?? 1));
        ctx.fillStyle = '#aaa'; ctx.font = '4px monospace';
        ctx.fillText(ac.entity.name.slice(0, 10), px + 6, allyY + 4);
        ctx.fillStyle = '#224422'; ctx.fillRect(px + 6, allyY + 5, barW, 4);
        ctx.fillStyle = ahpPct > 0.4 ? '#44aa44' : '#aa4444';
        ctx.fillRect(px + 6, allyY + 5, Math.ceil(barW * ahpPct), 4);
        allyY += 12;
      }
      allyY += 2;
    }

    if (battleSystem.state !== 'waiting_input' || battleSystem.isWaitingForOther) {
      ctx.fillStyle = '#888';
      ctx.font = '5px monospace';
      const waitMsg = battleSystem.isWaitingForOther
        ? `Waiting for Player ${battleSystem._waitingForNetworkId}...`
        : 'Waiting...';
      ctx.fillText(waitMsg, px + 6, allyY + 4);
      return;
    }

    // Action menu
    const menuY = allyY + 2;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(this._subMenu ? `> ${this._subMenu.toUpperCase()}` : 'ACTION:', px + 6, menuY);

    if (this._subMenu === null) {
      this._renderMainMenu(ctx, px, menuY + 4, pw, battleSystem);
    } else if (this._subMenu === 'skills') {
      this._renderSkillsMenu(ctx, px, menuY + 4, pw, battleSystem);
    } else if (this._subMenu === 'items') {
      this._renderItemsMenu(ctx, px, menuY + 4, pw, battleSystem);
    } else if (this._subMenu === 'move') {
      this._renderMoveMenu(ctx, px, menuY + 4, pw, battleSystem);
    } else if (this._subMenu === 'ally_target') {
      this._renderAllyTargetMenu(ctx, px, menuY + 4, pw, battleSystem);
    } else if (this._subMenu === 'arc') {
      ctx.fillStyle = '#ffdd00';
      ctx.font = '5px monospace';
      ctx.fillText('ARC AIM: ←→ rotate', px + 6, menuY + 12);
      ctx.fillText('Space/Enter: confirm', px + 6, menuY + 22);
      ctx.fillText('Esc: cancel', px + 6, menuY + 32);
    }
  }

  _renderMainMenu(ctx, px, py, pw, battleSystem) {
    const enemies = battleSystem.activeEnemyCombatants;
    const currentTarget = enemies[battleSystem._targetIdx];

    for (let i = 0; i < MAIN_MENU.length; i++) {
      const label = MAIN_MENU[i];
      const iy = py + 6 + i * 14;
      const isSel = i === this._menuIdx;

      if (isSel) {
        ctx.fillStyle = 'rgba(50,80,150,0.5)';
        ctx.fillRect(px + 4, iy - 5, pw - 8, 12);
      }

      ctx.fillStyle = isSel ? '#fff' : '#aaa';
      ctx.font = isSel ? 'bold 6px monospace' : '6px monospace';
      ctx.fillText(`${isSel ? '▶ ' : '  '}${label}`, px + 6, iy);

      // AV cost hint
      const costs = { Attack: '-600', Skills: '▸', Items: '-400', Move: '-250', Flee: '-400' };
      ctx.fillStyle = '#556';
      ctx.font = '5px monospace';
      ctx.fillText(costs[label] ?? '', px + pw - 32, iy);
    }

    // Target hint when on Attack
    if (MAIN_MENU[this._menuIdx] === 'Attack' && currentTarget) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '5px monospace';
      ctx.fillText(`← ${currentTarget.entity.name} →`, px + 6, py + 6 + MAIN_MENU.length * 14 + 6);
    }

    ctx.fillStyle = '#444';
    ctx.font = '4px monospace';
    ctx.fillText('↑↓ navigate  Spc confirm', px + 6, py + 6 + MAIN_MENU.length * 14 + 18);
  }

  _renderSkillsMenu(ctx, px, py, pw, battleSystem) {
    const skills = this._getSkillList(battleSystem);
    const all = [...skills, { id: '__back', def: { name: 'Back' } }];
    for (let i = 0; i < all.length; i++) {
      const sk = all[i];
      const iy = py + 8 + i * 13;
      const isSel = i === this._subIdx;
      const onCd = sk.onCooldown;

      if (isSel) { ctx.fillStyle = 'rgba(50,80,150,0.5)'; ctx.fillRect(px + 4, iy - 5, pw - 8, 11); }
      ctx.fillStyle = onCd ? '#555' : (isSel ? '#fff' : '#aaa');
      ctx.font = '6px monospace';
      ctx.fillText(`${isSel ? '▶ ' : '  '}${sk.def.name ?? sk.id}`, px + 6, iy);
      if (sk.def.mpCost) {
        ctx.fillStyle = '#447';
        ctx.font = '4px monospace';
        ctx.fillText(`MP:${sk.def.mpCost}`, px + pw - 28, iy);
      }
      if (sk.def.avCost) {
        ctx.fillStyle = '#556';
        ctx.font = '4px monospace';
        ctx.fillText(`AV:${sk.def.avCost}`, px + pw - 50, iy);
      }
    }
    ctx.fillStyle = '#444'; ctx.font = '4px monospace';
    ctx.fillText('Esc: back', px + 6, py + 8 + all.length * 13 + 4);
  }

  _renderAllyTargetMenu(ctx, px, py, pw, battleSystem) {
    const friendlies = this._getAllyTargetList(battleSystem);
    const skillId = this._arcSkillId;
    const sb = battleSystem.playerCombatant?.entity?.skillBook;
    const skillName = sb?.skills.get(skillId)?.name ?? skillId;
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(`${skillName} → target:`, px + 6, py + 6);
    for (let i = 0; i < friendlies.length; i++) {
      const f = friendlies[i];
      const iy = py + 18 + i * 13;
      const isSel = i === (this._allyTargetIdx ?? 0);
      if (isSel) { ctx.fillStyle = 'rgba(0,100,80,0.5)'; ctx.fillRect(px + 4, iy - 5, pw - 8, 11); }
      const hpPct = Math.max(0, (f.entity.stats?.current?.HP ?? 0) / (f.entity.stats?.derived?.HP ?? 1));
      ctx.fillStyle = isSel ? '#fff' : '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText(`${isSel ? '▶ ' : '  '}${f.entity.name}`, px + 6, iy);
      // Mini HP bar
      const bw = 40;
      ctx.fillStyle = '#300'; ctx.fillRect(px + pw - bw - 6, iy - 4, bw, 5);
      ctx.fillStyle = hpPct > 0.5 ? '#0c0' : hpPct > 0.25 ? '#cc0' : '#c00';
      ctx.fillRect(px + pw - bw - 6, iy - 4, Math.ceil(bw * hpPct), 5);
    }
    ctx.fillStyle = '#444'; ctx.font = '4px monospace';
    ctx.fillText('↑↓ select  Spc confirm  Esc back', px + 6, py + 18 + friendlies.length * 13 + 4);
  }

  _renderItemsMenu(ctx, px, py, pw, battleSystem) {
    const items = this._getItemList(battleSystem);
    const all = [...items, { item: { name: 'Back' }, slotIdx: -1 }];
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      const iy = py + 8 + i * 13;
      const isSel = i === this._subIdx;
      if (isSel) { ctx.fillStyle = 'rgba(50,80,150,0.5)'; ctx.fillRect(px + 4, iy - 5, pw - 8, 11); }
      ctx.fillStyle = isSel ? '#fff' : '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText(`${isSel ? '▶ ' : '  '}${entry.item.name} ×${entry.item.qty ?? 1}`, px + 6, iy);
    }
    ctx.fillStyle = '#444'; ctx.font = '4px monospace';
    ctx.fillText('Esc: back', px + 6, py + 8 + all.length * 13 + 4);
  }

  _renderMoveMenu(ctx, px, py, pw, battleSystem) {
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('MOVING', px + 6, py + 8);
    ctx.fillStyle = '#aaa';
    ctx.font = '5px monospace';
    ctx.fillText('WASD to reposition', px + 6, py + 18);
    ctx.fillText('Space: confirm  Esc: cancel', px + 6, py + 28);

    // Distance budget bar
    const barW = pw - 14;
    const pct = battleSystem?.moveProgress ?? 0;
    ctx.fillStyle = '#222'; ctx.fillRect(px + 6, py + 34, barW, 6);
    ctx.fillStyle = pct < 0.6 ? '#44cc44' : pct < 0.9 ? '#ccaa22' : '#cc4422';
    ctx.fillRect(px + 6, py + 34, Math.ceil(barW * pct), 6);
    ctx.fillStyle = '#556'; ctx.font = '4px monospace';
    ctx.fillText('Movement range', px + 6, py + 46);
  }

  _renderArcPreview(ctx, battleSystem, camera) {
    const pc = battleSystem.playerCombatant?.entity;
    if (!pc) return;

    // Transform player's world position to screen position
    const sx = (pc.cx - camera.x) * camera.zoom;
    const sy = (pc.cy - camera.y) * camera.zoom;
    const range = 48 * camera.zoom;
    const halfAngle = Math.PI * 0.45;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, range, this._arcAngle - halfAngle, this._arcAngle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,200,0,0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,0,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Highlight enemies in arc
    const inArc = battleSystem._getArcTargets(this._arcAngle, 48, halfAngle);
    for (const enemy of inArc) {
      const ex = (enemy.cx - camera.x) * camera.zoom;
      const ey = (enemy.cy - camera.y) * camera.zoom;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex - 8 * camera.zoom, ey - 8 * camera.zoom, 16 * camera.zoom, 16 * camera.zoom);
    }
    ctx.restore();
  }

  _renderBattleLog(ctx, battleSystem) {
    const log = battleSystem._battleLog ?? [];
    const lx = 240, ly = CANVAS_H - 48, lw = CANVAS_W - 430, lh = 46;
    ctx.fillStyle = 'rgba(5,5,20,0.85)';
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, ly, lw, lh);
    const toShow = log.slice(-4);
    for (let i = 0; i < toShow.length; i++) {
      ctx.fillStyle = i === toShow.length - 1 ? '#fff' : '#888';
      ctx.font = '5px monospace';
      ctx.fillText(toShow[i], lx + 4, ly + 8 + i * 10);
    }
  }
}
