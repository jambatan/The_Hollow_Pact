import { CANVAS_W, CANVAS_H, EVENTS } from '../../shared/constants.js';

const ICON_COLORS = {
  sword: '#aaa', shield: '#888', potion: '#e44', helmet: '#aaa',
  chest: '#885', boots: '#a75', ring: '#fa0', necklace: '#fc0',
  ore: '#966', herb: '#4a2', scroll: '#fa8', food: '#fa5',
  default: '#777',
};

// Paper-doll layout — left mirrors right (both are accessory columns)
// Col 0 (left):   Ear,   Wrist,  Ring,   _, Main
// Col 1 (center): Head,  Neck,   Chest,  Waist, Legs, Feet
// Col 2 (right):  Ear2,  Wrist2, Ring2,  _, Off
const EQ_SLOT_LAYOUT = [
  { name: 'earring',  label: 'Ear',   col: 0, row: 0 },
  { name: 'wrists',   label: 'Wrist', col: 0, row: 1 },
  { name: 'ring1',    label: 'Ring',  col: 0, row: 2 },
  { name: 'mainhand', label: 'Main',  col: 0, row: 4 },
  { name: 'head',     label: 'Head',  col: 1, row: 0 },
  { name: 'neck',     label: 'Neck',  col: 1, row: 1 },
  { name: 'chest',    label: 'Chest', col: 1, row: 2 },
  { name: 'waist',    label: 'Waist', col: 1, row: 3 },
  { name: 'legs',     label: 'Legs',  col: 1, row: 4 },
  { name: 'feet',     label: 'Feet',  col: 1, row: 5 },
  { name: 'earring2', label: 'Ear',   col: 2, row: 0 },
  { name: 'wrists2',  label: 'Wrist', col: 2, row: 1 },
  { name: 'ring2',    label: 'Ring',  col: 2, row: 2 },
  { name: 'offhand',  label: 'Off',   col: 2, row: 4 },
];

export class InventoryUI {
  constructor(events) {
    this.events    = events;
    this._mode     = 'bag';   // 'bag' | 'equip'
    this._selected = 0;       // inventory slot index (bag mode)
    this._eqSel    = 0;       // EQ_SLOT_LAYOUT index (equip mode)
    this._grabbing = false;   // space-to-swap grab state
    this._grabSlot = -1;
    this._inspecting = false; // Enter to show item stat detail panel
  }

  handleInput(input, player) {
    // Tab toggles between bag and equip mode (consistent with shop)
    if (input.pressed('Tab')) {
      this._mode = this._mode === 'bag' ? 'equip' : 'bag';
      this._inspecting = false;
      return;
    }

    // Escape cancels grab or closes inspect
    if (input.pressed('Escape')) {
      if (this._inspecting) { this._inspecting = false; return; }
      if (this._grabbing)   { this._grabbing = false; this._grabSlot = -1; return; }
    }

    // Enter toggles stat inspection on selected slot
    if (input.pressed('Enter')) {
      this._inspecting = !this._inspecting;
      return;
    }

    if (this._mode === 'bag') {
      this._handleBagInput(input, player);
    } else {
      this._handleEquipInput(input, player);
    }
  }

  _handleBagInput(input, player) {
    const inv = player?.inventory;
    if (!inv) return;
    const cap = inv.capacity;
    const COLS = 4;
    const ROWS = Math.ceil(cap / COLS);
    const col = this._selected % COLS;
    const row = Math.floor(this._selected / COLS);

    // Wrap within row (no row-shift at boundaries)
    if (input.pressed('ArrowRight')) {
      this._selected = row * COLS + (col + 1) % COLS;
    }
    if (input.pressed('ArrowLeft')) {
      this._selected = row * COLS + (col - 1 + COLS) % COLS;
    }
    // Wrap within column (no col-shift at top/bottom boundaries)
    if (input.pressed('ArrowDown')) {
      const next = ((row + 1) % ROWS) * COLS + col;
      this._selected = Math.min(next, cap - 1);
    }
    if (input.pressed('ArrowUp')) {
      const prev = ((row - 1 + ROWS) % ROWS) * COLS + col;
      this._selected = Math.min(prev, cap - 1);
    }

    // Space: grab/swap items
    if (input.pressed('Space')) {
      if (!this._grabbing) {
        if (inv.slots[this._selected]) {
          this._grabbing = true;
          this._grabSlot = this._selected;
        }
      } else {
        if (this._grabSlot === this._selected) {
          // Same slot: cancel grab
          this._grabbing = false;
          this._grabSlot = -1;
        } else {
          // Swap slots
          const tmp = inv.slots[this._grabSlot];
          inv.slots[this._grabSlot] = inv.slots[this._selected];
          inv.slots[this._selected] = tmp;
          this._grabbing = false;
          this._grabSlot = -1;
        }
      }
      return;
    }

    if (input.pressed('KeyE')) {
      const item = inv.slots[this._selected];
      if (!item) return;
      if (item.type === 'consumable' && item.effect) {
        const eff = item.effect;
        if (eff.type === 'heal' && player.stats?.heal) {
          player.stats.heal(eff.amount);
          this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} HP`, color: '#0c0' });
        } else if (eff.type === 'mp_restore' && player.stats?.restoreMp) {
          player.stats.restoreMp(eff.amount);
          this.events.emit(EVENTS.NOTIFICATION, { text: `+${eff.amount} MP`, color: '#44f' });
        }
        inv.remove(this._selected, 1);
      } else if (item.slot && player.equipment) {
        inv.remove(this._selected, 1);
        if (!player.equipment.equip(item, inv)) inv.add(item);
      }
    }

    if (input.pressed('KeyQ')) {
      const item = inv.slots[this._selected];
      if (item && !item.questItem) inv.remove(this._selected, 1);
    }
  }

  _handleEquipInput(input, player) {
    const cur = EQ_SLOT_LAYOUT[this._eqSel];

    // Up/Down: stay within same column (wrap within column)
    if (input.pressed('ArrowUp'))   this._eqSel = this._prevInCol(cur.col, cur.row);
    if (input.pressed('ArrowDown')) this._eqSel = this._nextInCol(cur.col, cur.row);

    // Left/Right: move to adjacent column, closest row
    if (input.pressed('ArrowLeft')) {
      const targetCol = Math.max(0, cur.col - 1);
      if (targetCol !== cur.col) this._eqSel = this._nearestInCol(targetCol, cur.row);
    }
    if (input.pressed('ArrowRight')) {
      const targetCol = Math.min(2, cur.col + 1);
      if (targetCol !== cur.col) this._eqSel = this._nearestInCol(targetCol, cur.row);
    }

    if (input.pressed('KeyE')) {
      const sl = EQ_SLOT_LAYOUT[this._eqSel];
      if (sl && player.equipment) {
        player.equipment.unequip(sl.name, player.inventory);
      }
    }
  }

  // Navigate within same column, wrapping at ends
  _prevInCol(col, row) {
    const slots = EQ_SLOT_LAYOUT.filter(s => s.col === col).sort((a, b) => a.row - b.row);
    const idx = slots.findIndex(s => s.row === row);
    const prev = slots[(idx - 1 + slots.length) % slots.length];
    return EQ_SLOT_LAYOUT.findIndex(s => s.name === prev.name);
  }

  _nextInCol(col, row) {
    const slots = EQ_SLOT_LAYOUT.filter(s => s.col === col).sort((a, b) => a.row - b.row);
    const idx = slots.findIndex(s => s.row === row);
    const next = slots[(idx + 1) % slots.length];
    return EQ_SLOT_LAYOUT.findIndex(s => s.name === next.name);
  }

  // Find slot in targetCol closest to given row
  _nearestInCol(col, row) {
    const slots = EQ_SLOT_LAYOUT.filter(s => s.col === col);
    if (!slots.length) return this._eqSel;
    const best = slots.reduce((a, b) =>
      Math.abs(a.row - row) <= Math.abs(b.row - row) ? a : b
    );
    return EQ_SLOT_LAYOUT.findIndex(s => s.name === best.name);
  }

  render(ctx, player) {
    if (!player?.inventory) return;
    const inv = player.inventory;
    const eq  = player.equipment;

    const PX = 40, PY = 20, PW = CANVAS_W - 80, PH = CANVAS_H - 40;
    ctx.fillStyle = 'rgba(10,10,30,0.96)';
    ctx.fillRect(PX, PY, PW, PH);
    ctx.strokeStyle = '#5588ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(PX, PY, PW, PH);

    // ── Mode tabs ──
    const tabs = [{ id: 'bag', label: 'BAG' }, { id: 'equip', label: 'EQUIP' }];
    tabs.forEach((tab, i) => {
      const tx = PX + 10 + i * 58;
      ctx.fillStyle = this._mode === tab.id ? '#334488' : '#222';
      ctx.fillRect(tx, PY + 3, 52, 12);
      ctx.strokeStyle = this._mode === tab.id ? '#5588ff' : '#444';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tx, PY + 3, 52, 12);
      ctx.fillStyle = this._mode === tab.id ? '#fff' : '#888';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(tab.label, tx + 6, PY + 12);
    });

    ctx.fillStyle = '#f1c40f';
    ctx.font = '7px monospace';
    ctx.fillText(`Gold: ${player.gold}g`, PX + PW - 110, PY + 13);

    // ── Inventory grid ──
    const gX = PX + 10, gY = PY + 22;
    const COLS = 4, CELL = 22, GAP = 2;
    for (let i = 0; i < inv.capacity; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = gX + col * (CELL + GAP);
      const cy = gY + row * (CELL + GAP);
      const item = inv.slots[i];
      const isSel  = this._mode === 'bag' && i === this._selected;
      const isGrab = i === this._grabSlot;

      ctx.fillStyle = isGrab ? '#443300' : isSel ? '#223366' : '#222';
      ctx.fillRect(cx, cy, CELL, CELL);
      ctx.strokeStyle = isGrab ? '#ffaa00' : isSel ? '#ffdd00' : '#444';
      ctx.lineWidth = (isGrab || isSel) ? 1 : 0.5;
      ctx.strokeRect(cx, cy, CELL, CELL);

      if (item) {
        this._drawIcon(ctx, cx + 2, cy + 2, CELL - 4, item);
        if (item.qty > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = '5px monospace';
          ctx.fillText(item.qty, cx + CELL - 7, cy + CELL - 2);
        }
      }
    }

    // Grab status indicator
    if (this._grabbing) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '5px monospace';
      ctx.fillText('GRAB MODE — navigate and Space to swap, Esc to cancel', gX, gY - 4);
    }

    // ── Equipment paper doll ──
    if (eq) {
      const EQ_CELL = 26, EQ_GAP = 5;
      const dollX = gX + COLS * (CELL + GAP) + 30;
      const dollY = gY;

      ctx.fillStyle = '#aaa';
      ctx.font = '7px monospace';
      ctx.fillText('Equipment', dollX, dollY - 4);

      for (let i = 0; i < EQ_SLOT_LAYOUT.length; i++) {
        const sl = EQ_SLOT_LAYOUT[i];
        const ex = dollX + sl.col * (EQ_CELL + EQ_GAP);
        const ey = dollY + sl.row * (EQ_CELL + EQ_GAP);
        const isSel = this._mode === 'equip' && i === this._eqSel;

        ctx.fillStyle = isSel ? '#223366' : '#141428';
        ctx.fillRect(ex, ey, EQ_CELL, EQ_CELL);
        ctx.strokeStyle = isSel ? '#ffdd00' : '#446';
        ctx.lineWidth = isSel ? 1 : 0.5;
        ctx.strokeRect(ex, ey, EQ_CELL, EQ_CELL);
        ctx.fillStyle = isSel ? '#aac' : '#556';
        ctx.font = '4px monospace';
        ctx.fillText(sl.label, ex + 1, ey + EQ_CELL - 2);

        const item = eq.getSlot(sl.name);
        if (item) this._drawIcon(ctx, ex + 2, ey + 2, EQ_CELL - 4, item);
      }
    }

    // ── Stats ──
    const stX = PX + PW - 128, stY = PY + 22;
    ctx.fillStyle = '#aaa';
    ctx.font = '7px monospace';
    ctx.fillText('Stats', stX, stY);
    const st = player.stats;
    const lines = [
      `STR: ${st.base.STR}  ATK: ${st.derived.ATK}`,
      `DEX: ${st.base.DEX}  SPD: ${st.derived.SPD}`,
      `INT: ${st.base.INT}`,
      `CON: ${st.base.CON}  DEF: ${st.derived.DEF}`,
      `WIS: ${st.base.WIS}`,
      `CHA: ${st.base.CHA}`,
      ``,
      `HP: ${st.current.HP}/${st.derived.HP}`,
      `MP: ${st.current.MP}/${st.derived.MP}`,
      `Lv: ${player.level}  XP: ${player.xp}/${player.xpToNext}`,
    ];
    ctx.font = '6px monospace';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = '#aaa';
      ctx.fillText(lines[i], stX, stY + 14 + i * 10);
    }

    // ── Tooltip ──
    let tooltipItem = null;
    if (this._mode === 'bag') {
      tooltipItem = inv.slots[this._selected];
    } else if (eq) {
      tooltipItem = eq.getSlot(EQ_SLOT_LAYOUT[this._eqSel]?.name);
    }
    if (tooltipItem && !this._inspecting) {
      ctx.fillStyle = '#ddd';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(tooltipItem.name, PX + 10, PY + PH - 18);
      ctx.fillStyle = '#999';
      ctx.font = '5px monospace';
      ctx.fillText(tooltipItem.description || '', PX + 10, PY + PH - 10);
    }

    // ── Item stat inspection panel ──
    if (this._inspecting && tooltipItem) {
      this._renderInspectPanel(ctx, PX, PY, PW, PH, tooltipItem);
    }

    ctx.fillStyle = '#666';
    ctx.font = '5px monospace';
    const hint = this._mode === 'bag'
      ? '[Tab] equip  [↑↓←→] nav  [E] use/equip  [Spc] grab/swap  [Q] drop  [Enter] inspect  [I] close'
      : '[Tab] bag  [↑↓] col nav  [←→] col switch  [E] unequip  [Enter] inspect  [I] close';
    ctx.fillText(hint, PX + 10, PY + PH - 2);
  }

  _renderInspectPanel(ctx, PX, PY, PW, PH, item) {
    const px = PX + PW - 160, py = PY + 22, pw = 148, ph = PH - 44;
    ctx.fillStyle = 'rgba(5,5,20,0.97)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);

    let y = py + 14;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(item.name, px + 6, y);
    y += 12;

    ctx.font = '6px monospace';
    if (item.type)   { ctx.fillStyle = '#aaa'; ctx.fillText(`Type: ${item.type}`, px + 6, y); y += 9; }
    if (item.slot)   { ctx.fillStyle = '#aaa'; ctx.fillText(`Slot: ${item.slot}`, px + 6, y); y += 9; }
    if (item.rarity) { ctx.fillStyle = '#fa0'; ctx.fillText(`${item.rarity}`, px + 6, y); y += 9; }

    // Stats bonuses
    const stats = item.stats ?? {};
    const statKeys = Object.keys(stats);
    if (statKeys.length > 0) {
      y += 4;
      ctx.fillStyle = '#88aaff';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('Bonuses:', px + 6, y);
      y += 9;
      ctx.font = '6px monospace';
      for (const k of statKeys) {
        const v = stats[k];
        ctx.fillStyle = v > 0 ? '#8f8' : '#f88';
        ctx.fillText(`  ${k}: ${v > 0 ? '+' : ''}${v}`, px + 6, y);
        y += 9;
        if (y > py + ph - 20) break;
      }
    }

    // Description (word-wrapped)
    if (item.description) {
      y += 4;
      ctx.fillStyle = '#999';
      ctx.font = '5px monospace';
      const words = item.description.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (test.length > 22) {
          ctx.fillText(line, px + 6, y); y += 8; line = word;
        } else {
          line = test;
        }
        if (y > py + ph - 18) break;
      }
      if (line) ctx.fillText(line, px + 6, y);
    }

    ctx.fillStyle = '#556';
    ctx.font = '5px monospace';
    ctx.fillText('[Enter/Esc] close', px + 6, py + ph - 6);
  }

  _drawIcon(ctx, x, y, size, item) {
    const color = ICON_COLORS[item.icon] ?? ICON_COLORS.default;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(5, size - 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(item.name[0], x + size / 2, y + size / 2 + 2);
    ctx.textAlign = 'left';
  }
}
