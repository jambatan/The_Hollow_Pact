import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';
import { ITEM_DB } from '../data/items.js';
import { EVENTS } from '../../shared/constants.js';

export class ShopUI {
  constructor(events) {
    this.events   = events;
    this.isOpen   = false;
    this._shop    = null;
    this._player  = null;
    this._tab     = 'buy'; // 'buy' | 'sell'
    this._selected = 0;
    this._message = '';
    this._msgTimer = 0;
  }

  open(merchant, player) {
    this.isOpen  = true;
    this._player = player;
    this._shop   = merchant._shopInstance ?? null;
    this._tab    = 'buy';
    this._selected = 0;
  }

  close() {
    this.isOpen = false;
    this._shop  = null;
    this._player = null;
    this.events.emit(EVENTS.SHOP_CLOSE);
  }

  handleInput(input) {
    if (!this.isOpen) return;
    if (input.pressed('Tab')) this._tab = this._tab === 'buy' ? 'sell' : 'buy';
    if (input.pressed('ArrowUp'))    this._selected = Math.max(0, this._selected - 1);
    if (input.pressed('ArrowDown'))  this._selected++;
    if (input.pressed('KeyE') || input.pressed('Space')) this._confirm();
    if (input.pressed('Escape'))     this.close();
  }

  _confirm() {
    if (!this._shop) return;
    if (this._tab === 'buy') {
      const res = this._shop.buy(this._selected, 1, this._player);
      this._flash(res.msg, res.ok ? '#8f8' : '#f88');
    } else {
      // Find actual slot index for the selected visible row
      let slotIndex = -1, row = 0;
      const slots = this._player.inventory.slots;
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i]) continue;
        if (row === this._selected) { slotIndex = i; break; }
        row++;
      }
      if (slotIndex === -1) return;
      const res = this._shop.sell(slotIndex, 1, this._player);
      this._flash(res.msg, res.ok ? '#8f8' : '#f88');
    }
  }

  _flash(msg, color) {
    this._message  = msg;
    this._msgColor = color;
    this._msgTimer = 2;
  }

  update(dt) { if (this._msgTimer > 0) this._msgTimer -= dt; }

  render(ctx, player) {
    if (!this.isOpen || !this._shop) return;
    const bx = 60, by = 40, bw = CANVAS_W - 120, bh = CANVAS_H - 80;

    ctx.fillStyle = 'rgba(10,10,30,0.96)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#aa8822';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`Shop`, bx + 10, by + 14);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Your gold: ${player.gold}g`, bx + bw - 110, by + 14);

    // Tabs
    ['buy', 'sell'].forEach((tab, i) => {
      const tx = bx + 10 + i * 60;
      ctx.fillStyle = this._tab === tab ? '#446' : '#222';
      ctx.fillRect(tx, by + 18, 55, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '6px monospace';
      ctx.fillText(tab.toUpperCase(), tx + 4, by + 27);
    });

    const listY = by + 36;
    if (this._tab === 'buy') {
      this._renderBuyList(ctx, bx + 10, listY, bw - 20, bh - 50);
    } else {
      this._renderSellList(ctx, bx + 10, listY, bw - 20, bh - 50, player);
    }

    // Message
    if (this._msgTimer > 0) {
      ctx.fillStyle = this._msgColor ?? '#fff';
      ctx.font = '7px monospace';
      ctx.fillText(this._message, bx + 10, by + bh - 10);
    }

    ctx.fillStyle = '#888';
    ctx.font = '5px monospace';
    ctx.fillText('↑↓ navigate  E/SPC confirm  TAB switch  ESC close', bx + 10, by + bh - 2);
  }

  _renderBuyList(ctx, x, y, w, h) {
    const stock = this._shop?.stock ?? [];
    for (let i = 0; i < stock.length; i++) {
      const entry  = stock[i];
      const def    = ITEM_DB[entry.itemId];
      if (!def) continue;
      const iy     = y + i * 16;
      if (iy > y + h - 16) break;
      const price  = this._shop.buyPrice(entry);
      const inStock = entry.qty === Infinity ? '∞' : entry.qty;

      ctx.fillStyle = i === this._selected ? '#334' : 'transparent';
      ctx.fillRect(x, iy, w, 14);
      ctx.fillStyle = i === this._selected ? '#fff' : '#ccc';
      ctx.font = '7px monospace';
      ctx.fillText(def.name, x + 4, iy + 9);
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`${price}g`, x + w - 60, iy + 9);
      ctx.fillStyle = '#888';
      ctx.fillText(`(${inStock})`, x + w - 28, iy + 9);
    }
    this._selected = Math.min(this._selected, Math.max(0, stock.length - 1));
  }

  _renderSellList(ctx, x, y, w, h, player) {
    const slots = player.inventory.slots;
    let row = 0;
    for (let i = 0; i < slots.length; i++) {
      const item = slots[i];
      if (!item) continue;
      const iy = y + row * 16;
      if (iy > y + h - 16) break;
      const val = this._shop.sellValue(item);

      ctx.fillStyle = row === this._selected ? '#334' : 'transparent';
      ctx.fillRect(x, iy, w, 14);
      ctx.fillStyle = row === this._selected ? '#fff' : '#ccc';
      ctx.font = '7px monospace';
      ctx.fillText(`${item.name} x${item.qty}`, x + 4, iy + 9);
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`${val}g ea`, x + w - 50, iy + 9);
      row++;
    }
  }
}
