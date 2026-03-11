import { SLOT_NAMES, EVENTS } from '../../shared/constants.js';

export class Equipment {
  constructor(events, statBlock) {
    this.events    = events;
    this.statBlock = statBlock;
    this.slots = {};
    for (const s of SLOT_NAMES) this.slots[s] = null;
  }

  equip(item, inventory) {
    if (!item.slot) return false;
    // Unequip existing
    if (this.slots[item.slot]) {
      if (!inventory.add(this.slots[item.slot])) return false;
    }
    this.slots[item.slot] = item;
    this._recalcBonuses();
    this.events.emit(EVENTS.INVENTORY_CHANGED, {});
    return true;
  }

  unequip(slotName, inventory) {
    const item = this.slots[slotName];
    if (!item) return false;
    if (!inventory.add(item)) return false;
    this.slots[slotName] = null;
    this._recalcBonuses();
    this.events.emit(EVENTS.INVENTORY_CHANGED, {});
    return true;
  }

  _recalcBonuses() {
    // Reset bonus stats
    for (const k of Object.keys(this.statBlock.bonus)) this.statBlock.bonus[k] = 0;
    // Sum equipment stats
    for (const item of Object.values(this.slots)) {
      if (!item) continue;
      for (const [k, v] of Object.entries(item.stats ?? {})) {
        if (k in this.statBlock.bonus) this.statBlock.bonus[k] = (this.statBlock.bonus[k] ?? 0) + v;
      }
    }
    this.statBlock.recalc();
  }

  getSlot(name) { return this.slots[name] ?? null; }
}
