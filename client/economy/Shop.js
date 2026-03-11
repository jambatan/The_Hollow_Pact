import { ItemFactory } from '../inventory/ItemFactory.js';
import { EVENTS } from '../../shared/constants.js';

export class Shop {
  constructor(events, shopId, stockDef) {
    this.events  = events;
    this.shopId  = shopId;
    // Clone stock (Infinity qty = unlimited)
    this.stock = stockDef.map(entry => ({
      itemId: entry.itemId,
      qty:    entry.qty,
      price:  entry.price ?? null, // null = use item base value
    }));
  }

  buyPrice(entry) {
    const def = ItemFactory.create(entry.itemId, 1);
    return entry.price ?? def?.value ?? 0;
  }

  sellValue(item) {
    return item.sellValue ?? Math.floor((item.value ?? 0) * 0.5);
  }

  // Player buys from shop
  buy(entryIndex, qty, player) {
    const entry = this.stock[entryIndex];
    if (!entry) return { ok: false, msg: 'Invalid item.' };
    if (entry.qty !== Infinity && entry.qty < qty)
      return { ok: false, msg: 'Not enough stock.' };

    const price = this.buyPrice(entry) * qty;
    if (player.gold < price) return { ok: false, msg: 'Not enough gold.' };

    const item = ItemFactory.create(entry.itemId, qty);
    if (!item) return { ok: false, msg: 'Unknown item.' };
    if (!player.inventory.add(item)) return { ok: false, msg: 'Inventory full.' };

    player.gold -= price;
    if (entry.qty !== Infinity) entry.qty -= qty;
    this.events.emit(EVENTS.INVENTORY_CHANGED, {});
    return { ok: true, msg: `Bought ${qty}x ${item.name}` };
  }

  // Player sells to shop
  sell(slotIndex, qty, player) {
    const item = player.inventory.slots[slotIndex];
    if (!item) return { ok: false, msg: 'No item.' };
    if (item.questItem) return { ok: false, msg: "Can't sell quest items." };

    const actual = Math.min(qty, item.qty);
    const earned = this.sellValue(item) * actual;
    player.inventory.remove(slotIndex, actual);
    player.gold += earned;
    this.events.emit(EVENTS.INVENTORY_CHANGED, {});
    return { ok: true, msg: `Sold ${actual}x ${item.name} for ${earned}g` };
  }
}
