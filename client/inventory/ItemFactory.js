import { Item } from './Item.js';
import { ITEM_DB } from '../data/items.js';

export class ItemFactory {
  static create(itemId, qty = 1) {
    const def = ITEM_DB[itemId];
    if (!def) { console.warn(`ItemFactory: unknown item "${itemId}"`); return null; }
    return new Item(def, qty);
  }
}
