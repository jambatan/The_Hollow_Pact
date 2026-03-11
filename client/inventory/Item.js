export class Item {
  constructor(def, qty = 1) {
    this.itemId      = def.id;
    this.name        = def.name;
    this.type        = def.type;        // weapon, armor, consumable, material, quest
    this.subtype     = def.subtype ?? null; // sword, bow, head, chest, ...
    this.icon        = def.icon ?? 'default';
    this.description = def.description ?? '';
    this.value       = def.value ?? 0;  // base gold value
    this.stackable   = def.stackable ?? (def.type === 'material' || def.type === 'consumable');
    this.maxStack    = def.maxStack ?? (this.stackable ? 99 : 1);
    this.qty         = Math.min(qty, this.maxStack);
    this.stats       = def.stats ?? {};  // { ATK: 5, DEF: 2, ... }
    this.slot        = def.slot ?? null; // equipment slot
    this.effect      = def.effect ?? null; // { type: 'heal', amount: 30 }
    this.questItem   = def.questItem ?? false;
  }

  get sellValue() { return Math.floor(this.value * 0.5); }
}
