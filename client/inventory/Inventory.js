import { EVENTS } from '../../shared/constants.js';

export class Inventory {
  constructor(events, capacity = 24) {
    this.events   = events;
    this.capacity = capacity;
    this.slots    = new Array(capacity).fill(null);
  }

  add(item) {
    // Try stacking first
    if (item.stackable) {
      for (const slot of this.slots) {
        if (slot && slot.itemId === item.itemId && slot.qty < slot.maxStack) {
          const room = slot.maxStack - slot.qty;
          const add  = Math.min(room, item.qty);
          slot.qty  += add;
          item.qty  -= add;
          if (item.qty <= 0) {
            this.events.emit(EVENTS.INVENTORY_CHANGED, { inventory: this });
            return true;
          }
        }
      }
    }
    // Find empty slot
    const empty = this.slots.findIndex(s => s === null);
    if (empty === -1) return false;
    this.slots[empty] = item;
    this.events.emit(EVENTS.INVENTORY_CHANGED, { inventory: this });
    return true;
  }

  remove(slotIndex, qty = 1) {
    const item = this.slots[slotIndex];
    if (!item) return null;
    if (item.stackable && item.qty > qty) {
      item.qty -= qty;
      this.events.emit(EVENTS.INVENTORY_CHANGED, { inventory: this });
      return { ...item, qty };
    }
    this.slots[slotIndex] = null;
    this.events.emit(EVENTS.INVENTORY_CHANGED, { inventory: this });
    return item;
  }

  removeById(itemId, qty = 1) {
    let remaining = qty;
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (!slot || slot.itemId !== itemId) continue;
      const take = Math.min(slot.qty, remaining);
      slot.qty -= take;
      remaining -= take;
      if (slot.qty <= 0) this.slots[i] = null;
    }
    if (remaining < qty) this.events.emit(EVENTS.INVENTORY_CHANGED, { inventory: this });
    return remaining === 0;
  }

  countById(itemId) {
    return this.slots.reduce((acc, s) => acc + (s?.itemId === itemId ? s.qty : 0), 0);
  }

  hasItem(itemId, qty = 1) { return this.countById(itemId) >= qty; }

  get usedSlots() { return this.slots.filter(Boolean).length; }
  get isFull()    { return this.usedSlots >= this.capacity; }
}
