import { EVENTS } from '../../shared/constants.js';
import { LOOT_TABLE_DB } from '../data/lootTables.js';

export class LootSystem {
  constructor(events) {
    this.events = events;
    events.on(EVENTS.ENTITY_DIED, this._onDeath.bind(this));
  }

  _onDeath({ entity, killer }) {
    if (!entity.tags.has('enemy')) return;

    // Rare/boss kills get a 2× multiplier on gold and XP
    const rareMult = (entity._isRare || entity._isBoss) ? 2 : 1;

    // Gold drop
    if (entity.goldRange) {
      const [min, max] = entity.goldRange;
      const gold = Math.floor((min + Math.random() * (max - min + 1)) * rareMult);
      if (gold > 0 && killer?.tags?.has('player')) {
        killer.gold += gold;
        this.events.emit(EVENTS.NOTIFICATION, {
          text: `+${gold}g`, color: '#f1c40f', x: entity.cx, y: entity.y - 8
        });
      }
    }

    // XP reward
    if (entity.xpReward && killer?.tags?.has('player')) {
      killer.gainXP(entity.xpReward * rareMult);
      this.events.emit(EVENTS.NOTIFICATION, {
        text: `+${entity.xpReward} XP`, color: '#88ff88', x: entity.cx, y: entity.y - 14
      });
    }

    // Item drops — all shared loot tables + individual drops stack
    const ids = entity.lootTableIds ?? (entity.lootTableId ? [entity.lootTableId] : []);
    const sharedDrops = ids.flatMap(id => LOOT_TABLE_DB[id]?.drops ?? []);
    const allDrops = [...sharedDrops, ...(entity.dropTable ?? [])];
    if (allDrops.length && killer?.tags?.has('player') && killer.inventory) {
      for (const entry of allDrops) {
        if (Math.random() < entry.chance) {
          const qty = entry.qty ?? 1;
          // ItemFactory imported lazily to avoid circular deps
          import('../inventory/ItemFactory.js').then(({ ItemFactory }) => {
            const item = ItemFactory.create(entry.itemId, qty);
            if (item && killer.inventory.add(item)) {
              this.events.emit(EVENTS.ITEM_ACQUIRED, { itemId: entry.itemId, quantity: qty });
              this.events.emit(EVENTS.NOTIFICATION, {
                text: `Got: ${item.name}`, color: '#aaddff', x: entity.cx, y: entity.y - 20
              });
            }
          });
        }
      }
    }
  }
}

