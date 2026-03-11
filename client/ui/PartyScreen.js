import { CANVAS_W, CANVAS_H, STATS, EVENTS } from '../../shared/constants.js';

const W = 420, H = 320;
const PX = (CANVAS_W - W) / 2;
const PY = (CANVAS_H - H) / 2;
const TABS = ['PARTY', 'WORLD'];

export class PartyScreen {
  constructor() {
    this._tab      = 0;   // 0=PARTY, 1=WORLD
    this._selected = 0;
    this._itemMode = false;
    this._itemSel  = 0;
  }

  // ── Input ──

  handleInput(input, player, game) {
    // Tab switch with Tab key
    if (input.pressed('Tab')) {
      this._tab = (this._tab + 1) % TABS.length;
      this._selected = 0;
      return;
    }

    if (this._tab === 0) this._handlePartyInput(input, player, game);
    else                 this._handleWorldInput(input, game);
  }

  _handlePartyInput(input, player, game) {
    const members = this._getPartyMembers(game);

    if (this._itemMode) {
      const consumables = this._getConsumables(player);
      if (input.pressed('ArrowUp'))   this._itemSel = Math.max(0, this._itemSel - 1);
      if (input.pressed('ArrowDown')) this._itemSel = Math.min(consumables.length - 1, this._itemSel + 1);
      if (input.pressed('Escape') || input.pressed('KeyU')) { this._itemMode = false; }
      if (input.pressed('Space') || input.pressed('Enter')) {
        this._useItem(consumables[this._itemSel], members[this._selected], player);
        this._itemMode = false;
      }
      return;
    }

    if (input.pressed('ArrowUp'))   this._selected = Math.max(0, this._selected - 1);
    if (input.pressed('ArrowDown')) this._selected = Math.min(members.length - 1, this._selected + 1);
    if (input.pressed('KeyU') && members.length > 0) {
      const consumables = this._getConsumables(player);
      if (consumables.length > 0) { this._itemMode = true; this._itemSel = 0; }
    }
    // D = dismiss selected NPC party member (send them home)
    if (input.pressed('KeyD') && members.length > 0) {
      const sel = members[this._selected];
      if (sel && !sel.tags?.has('remote_player')) game._dismissPartyMember?.(sel);
    }
    // L = leave party (remote party members only)
    if (input.pressed('KeyL') && game._remotePartyIds?.size > 0) {
      game.network.sendPartyLeave();
      game._remotePartyIds.clear();
      game.events.emit(EVENTS.NOTIFICATION, { text: 'Left party', color: '#aaa' });
    }
  }

  _handleWorldInput(input, game) {
    const world = this._getWorldPlayers(game);
    if (input.pressed('ArrowUp'))   this._selected = Math.max(0, this._selected - 1);
    if (input.pressed('ArrowDown')) this._selected = Math.min(world.length - 1, this._selected + 1);

    const sel = world[this._selected];
    if (!sel) return;

    // I = invite to party
    if (input.pressed('KeyI')) {
      if (!game._remotePartyIds?.has(sel.id)) {
        game.network.sendPartyInvite(sel.id);
        game.events.emit(EVENTS.NOTIFICATION, { text: `Party invite sent to Player ${sel.id}`, color: '#88ccff' });
      }
    }
    // G = go to party member's zone
    if (input.pressed('KeyG')) {
      if (game._remotePartyIds?.has(sel.id)) {
        const toZone = sel._currentZoneId;
        if (toZone && toZone !== game.world.current?.id) {
          game.events.emit(EVENTS.ZONE_TRANSITION, { player: game.localPlayer, toZone });
        }
      }
    }
    // T = trade (placeholder)
    if (input.pressed('KeyT')) {
      game.events.emit(EVENTS.NOTIFICATION, { text: 'Trade — coming soon!', color: '#aaa' });
    }
  }

  // ── Data helpers ──

  _getPartyMembers(game) {
    const npcs    = game?._partyMembers ? [...game._partyMembers.values()] : [];
    const remotes = (game?._remotePartyIds && game?._remotePlayers)
      ? [...game._remotePartyIds].map(id => game._remotePlayers.get(id)).filter(Boolean)
      : [];
    return [...npcs, ...remotes];
  }

  _getWorldPlayers(game) {
    if (!game?._remotePlayers) return [];
    return [...game._remotePlayers.values()];
  }

  _getConsumables(player) {
    if (!player?.inventory) return [];
    return player.inventory.slots
      .map((item, idx) => item ? { item, idx } : null)
      .filter(e => e && e.item.type === 'consumable');
  }

  _useItem(entry, target, player) {
    if (!entry || !target?.stats) return;
    const effect = entry.item.effect;
    if (effect?.type === 'heal')       target.stats.current.HP = Math.min(target.stats.derived.HP, target.stats.current.HP + effect.amount);
    if (effect?.type === 'mp_restore') target.stats.current.MP = Math.min(target.stats.derived.MP, target.stats.current.MP + effect.amount);
    player.inventory.remove(entry.idx, 1);
  }

  // ── Render ──

  render(ctx, player, game) {
    ctx.save();
    try {
      // Backdrop
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Panel
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(PX, PY, W, H);
      ctx.strokeStyle = '#5566cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(PX, PY, W, H);

      // ── Tab bar ──
      const tabW = W / TABS.length;
      TABS.forEach((label, i) => {
        const tx = PX + i * tabW;
        const active = i === this._tab;
        ctx.fillStyle = active ? '#2a2a4e' : '#111128';
        ctx.fillRect(tx, PY, tabW, 20);
        ctx.strokeStyle = active ? '#8899ff' : '#334';
        ctx.lineWidth = active ? 1 : 0.5;
        ctx.strokeRect(tx, PY, tabW, 20);
        ctx.fillStyle = active ? '#ffdd88' : '#778';
        ctx.font = (active ? 'bold ' : '') + '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, tx + tabW / 2, PY + 13);
        ctx.textAlign = 'left';
      });

      if (this._tab === 0) this._renderPartyTab(ctx, player, game);
      else                 this._renderWorldTab(ctx, game);

      // Bottom hint
      ctx.fillStyle = '#555';
      ctx.font = '5px monospace';
      ctx.fillText('[Tab] switch tab  [P/Esc] close', PX + 8, PY + H - 5);

    } catch (e) { console.error('PartyScreen render error:', e); }
    ctx.restore();
  }

  _renderPartyTab(ctx, player, game) {
    const members = this._getPartyMembers(game);
    const contentY = PY + 24;

    if (members.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '7px monospace';
      ctx.fillText('No party members yet.', PX + 10, contentY + 16);
      ctx.fillStyle = '#555';
      ctx.font = '6px monospace';
      ctx.fillText('Walk up to another player and press E to invite,', PX + 10, contentY + 32);
      ctx.fillText('or use the World Players tab.', PX + 10, contentY + 44);
      return;
    }

    // Member list (left column)
    const listW = 190;
    let ly = contentY + 4;
    members.forEach((pm, i) => {
      const selected = i === this._selected;
      if (selected) {
        ctx.fillStyle = 'rgba(80,100,180,0.4)';
        ctx.fillRect(PX + 4, ly - 2, listW - 4, 42);
      }
      ctx.fillStyle = selected ? '#ffdd88' : '#666';
      ctx.font = '6px monospace';
      ctx.fillText(selected ? '▶' : ' ', PX + 6, ly + 8);
      ctx.fillStyle = selected ? '#fff' : '#aaa';
      ctx.font = (selected ? 'bold ' : '') + '7px monospace';
      ctx.fillText(pm.name, PX + 16, ly + 8);
      if (pm.tags?.has('remote_player')) {
        ctx.fillStyle = '#88ccff';
        ctx.font = '5px monospace';
        ctx.fillText('[online]', PX + 16 + ctx.measureText(pm.name).width + 4, ly + 8);
      }
      if (pm.stats) {
        const hp = pm.stats.current.HP ?? 0, maxHp = pm.stats.derived.HP ?? 1;
        const mp = pm.stats.current.MP ?? 0, maxMp = pm.stats.derived.MP ?? 1;
        this._bar(ctx, PX + 16, ly + 12, 140, 7, hp / maxHp, hp > maxHp * 0.3 ? '#0c0' : '#c40', '#300', `HP ${hp}/${maxHp}`);
        this._bar(ctx, PX + 16, ly + 22, 140, 7, mp / Math.max(1, maxMp), '#44f', '#003', `MP ${mp}/${maxMp}`);
      }
      ly += 46;
    });

    // Divider
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PX + listW + 4, PY + 22);
    ctx.lineTo(PX + listW + 4, PY + H - 16);
    ctx.stroke();

    // Detail panel (right side)
    const sel = members[Math.min(this._selected, members.length - 1)];
    if (sel) this._renderMemberDetail(ctx, sel, PX + listW + 10, contentY + 4);

    // Item sub-panel
    if (this._itemMode) this._renderItemPanel(ctx, player, members);

    // Hints
    ctx.fillStyle = '#666';
    ctx.font = '5px monospace';
    ctx.fillText(this._itemMode ? '' : '[↑↓] member  [U] use item  [D] dismiss NPC  [L] leave party', PX + 8, PY + H - 14);
  }

  _renderMemberDetail(ctx, sel, dx, dy) {
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(sel.name, dx, dy + 8);

    if (sel.tags?.has('remote_player')) {
      ctx.font = '6px monospace';
      let row = dy + 22;
      ctx.fillStyle = '#88ccff';
      ctx.fillText('[Online Player]', dx, row); row += 14;
      const rhp = sel.stats?.current?.HP ?? '?', rmxhp = sel.stats?.derived?.HP ?? '?';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`HP: ${rhp} / ${rmxhp}`, dx, row); row += 12;
      ctx.fillStyle = '#556';
      ctx.fillText(`Zone: ${sel._currentZoneId ?? '?'}`, dx, row);
    } else if (sel.stats) {
      const st = sel.stats;
      ctx.font = '6px monospace';
      let row = dy + 22;
      if (st.base) {
        STATS.forEach((stat, si) => {
          const col = si % 3, r = Math.floor(si / 3);
          ctx.fillStyle = '#888';
          ctx.fillText(`${stat}`, dx + col * 60, row + r * 12);
          ctx.fillStyle = '#ddd';
          ctx.fillText(`${st.base[stat] ?? '?'}`, dx + col * 60 + 22, row + r * 12);
        });
        row += 32;
      }
      [['ATK', st.derived?.ATK], ['DEF', st.derived?.DEF], ['SPD', st.derived?.SPD]].forEach(([k, v], i) => {
        ctx.fillStyle = '#888'; ctx.fillText(k, dx + i * 60, row);
        ctx.fillStyle = '#ddd'; ctx.fillText(`${v ?? 0}`, dx + i * 60 + 22, row);
      });
      row += 16;
      if (sel._level) {
        ctx.fillStyle = '#ffdd88';
        ctx.fillText(`Lv.${sel._level}  XP: ${sel._xp ?? 0}/${sel._xpToNext ?? 100}`, dx, row);
        row += 12;
      }
      if (sel.skillBook) {
        ctx.fillStyle = '#88ccff';
        ctx.fillText('Skills:', dx, row); row += 10;
        for (const [, sk] of sel.skillBook.skills ?? []) {
          ctx.fillStyle = '#ccc';
          ctx.fillText(`• ${sk.name} (MP:${sk.mpCost})`, dx, row); row += 10;
        }
      }
    }
  }

  _renderItemPanel(ctx, player, members) {
    const consumables = this._getConsumables(player);
    const subW = 160, subH = Math.min(160, consumables.length * 14 + 24);
    const sx = PX + W / 2 - subW / 2, sy = PY + H / 2 - subH / 2;
    ctx.fillStyle = 'rgba(10,10,30,0.95)';
    ctx.fillRect(sx, sy, subW, subH);
    ctx.strokeStyle = '#8899ff'; ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, subW, subH);
    ctx.fillStyle = '#ffdd88'; ctx.font = 'bold 7px monospace';
    ctx.fillText(`Use on ${members[this._selected]?.name ?? '?'}:`, sx + 6, sy + 12);
    if (consumables.length === 0) {
      ctx.fillStyle = '#666'; ctx.font = '6px monospace';
      ctx.fillText('No consumables.', sx + 6, sy + 26);
    } else {
      consumables.forEach(({ item }, i) => {
        const s = i === this._itemSel;
        ctx.fillStyle = s ? '#fff' : '#aaa';
        ctx.font = (s ? 'bold ' : '') + '6px monospace';
        ctx.fillText(`${s ? '▶' : ' '} ${item.name ?? item.itemId} ×${item.qty}`, sx + 6, sy + 24 + i * 14);
      });
    }
    ctx.fillStyle = '#666'; ctx.font = '5px monospace';
    ctx.fillText('[↑↓] select  [Spc] use  [U/Esc] cancel', sx + 4, sy + subH - 4);
  }

  _renderWorldTab(ctx, game) {
    const players = this._getWorldPlayers(game);
    const contentY = PY + 26;

    if (players.length === 0) {
      ctx.fillStyle = '#666'; ctx.font = '7px monospace';
      ctx.fillText('No other players online in this room.', PX + 10, contentY + 20);
      return;
    }

    const listW = 200;
    let ly = contentY;

    players.forEach((rp, i) => {
      const selected = i === this._selected;
      const inParty  = game?._remotePartyIds?.has(rp.id) ?? false;

      if (selected) {
        ctx.fillStyle = 'rgba(80,100,180,0.35)';
        ctx.fillRect(PX + 4, ly, W - 8, 48);
        ctx.strokeStyle = '#5566cc'; ctx.lineWidth = 0.5;
        ctx.strokeRect(PX + 4, ly, W - 8, 48);
      }

      // Arrow + name
      ctx.fillStyle = selected ? '#ffdd88' : '#666';
      ctx.font = '6px monospace';
      ctx.fillText(selected ? '▶' : ' ', PX + 6, ly + 10);
      ctx.fillStyle = selected ? '#fff' : '#aaa';
      ctx.font = (selected ? 'bold ' : '') + '7px monospace';
      ctx.fillText(rp._charName ?? `Player ${rp.id}`, PX + 16, ly + 10);

      // "Online" badge if not yet named
      if (!rp._charName) {
        ctx.fillStyle = '#556677'; ctx.font = '5px monospace';
        ctx.fillText('[selecting…]', PX + 16, ly + 20);
      }

      // Zone
      ctx.fillStyle = '#667';
      ctx.font = '5px monospace';
      ctx.fillText(`Zone: ${rp._currentZoneId ?? '?'}`, PX + 16, ly + 20);

      // HP bar if available
      if (rp.stats) {
        const hp = rp.stats.current?.HP ?? 0, maxHp = rp.stats.derived?.HP ?? 1;
        this._bar(ctx, PX + 16, ly + 26, listW - 20, 6, hp / maxHp, '#0c0', '#200', `HP ${hp}/${maxHp}`);
      }

      // Buttons (right side)
      const bx = PX + listW + 20;

      // Invite / In Party button
      if (inParty) {
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(bx, ly + 4, 72, 12);
        ctx.fillStyle = '#88ccff'; ctx.font = '6px monospace';
        ctx.fillText('[In Party]', bx + 4, ly + 13);
      } else {
        ctx.fillStyle = selected ? '#1a3a1a' : '#111';
        ctx.fillRect(bx, ly + 4, 72, 12);
        ctx.strokeStyle = selected ? '#44cc44' : '#334'; ctx.lineWidth = 0.5;
        ctx.strokeRect(bx, ly + 4, 72, 12);
        ctx.fillStyle = selected ? '#88ff88' : '#556'; ctx.font = '6px monospace';
        ctx.fillText('[I] Invite', bx + 4, ly + 13);
      }

      // Go To button (only when in party + different zone)
      const canGoTo = inParty && rp._currentZoneId;
      ctx.fillStyle = canGoTo ? (selected ? '#1f2a3a' : '#111') : '#0d0d0d';
      ctx.fillRect(bx, ly + 18, 72, 12);
      if (canGoTo) { ctx.strokeStyle = selected ? '#4488cc' : '#334'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, ly + 18, 72, 12); }
      ctx.fillStyle = canGoTo ? (selected ? '#88ccff' : '#446') : '#333'; ctx.font = '6px monospace';
      ctx.fillText('[G] Go To', bx + 4, ly + 27);

      // Trade button (placeholder)
      ctx.fillStyle = '#111';
      ctx.fillRect(bx, ly + 32, 72, 12);
      ctx.strokeStyle = '#334'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, ly + 32, 72, 12);
      ctx.fillStyle = '#445'; ctx.font = '6px monospace';
      ctx.fillText('[T] Trade', bx + 4, ly + 41);

      ly += 52;
      if (ly > PY + H - 30) return; // clip overflow
    });

    // Hints
    ctx.fillStyle = '#666'; ctx.font = '5px monospace';
    ctx.fillText('[↑↓] navigate  [I] invite  [G] go to zone  [T] trade', PX + 8, PY + H - 14);
  }

  _bar(ctx, x, y, w, h, pct, fill, bg, label) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.ceil(w * Math.max(0, Math.min(1, pct))), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
    if (label) {
      ctx.fillStyle = '#fff'; ctx.font = '5px monospace';
      ctx.fillText(label, x + 2, y + h - 1);
    }
  }
}
