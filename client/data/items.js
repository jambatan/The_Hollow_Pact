export const ITEM_DB = {
  // ===== WEAPONS =====
  sword_iron: {
    id: 'sword_iron', name: 'Iron Sword', type: 'weapon', subtype: 'sword',
    slot: 'mainhand', icon: 'sword', description: 'A reliable iron blade.',
    value: 80, stackable: false, stats: { ATK: 8 },
  },
  sword_reinforced_iron: {
    id: 'sword_reinforced_iron', name: 'Reinforced Iron Sword', type: 'weapon', subtype: 'sword',
    slot: 'mainhand', icon: 'sword', description: 'Iron sword with added steel reinforcement.',
    value: 200, stackable: false, stats: { ATK: 14 },
  },
  dagger_steel: {
    id: 'dagger_steel', name: 'Steel Dagger', type: 'weapon', subtype: 'dagger',
    slot: 'mainhand', icon: 'sword', description: 'Fast and accurate.',
    value: 120, stackable: false, stats: { ATK: 10, DEX: 1 },
  },
  staff_apprentice: {
    id: 'staff_apprentice', name: "Apprentice's Staff", type: 'weapon', subtype: 'staff',
    slot: 'mainhand', icon: 'scroll', description: 'A gnarled wooden staff inscribed with runes.',
    value: 150, stackable: false, stats: { ATK: 6, INT: 2 },
  },
  bow_shortbow: {
    id: 'bow_shortbow', name: 'Short Bow', type: 'weapon', subtype: 'bow',
    slot: 'mainhand', icon: 'sword', description: 'A nimble ranged weapon.',
    value: 130, stackable: false, stats: { ATK: 9, DEX: 1 },
  },
  axe_woodcutters: {
    id: 'axe_woodcutters', name: "Woodcutter's Axe", type: 'weapon', subtype: 'axe',
    slot: 'mainhand', icon: 'sword', description: 'Repurposed as a weapon in dire times.',
    value: 60, stackable: false, stats: { ATK: 7 },
  },

  // ===== ARMOR =====
  boots_leather: {
    id: 'boots_leather', name: 'Leather Boots', type: 'armor', subtype: 'feet',
    slot: 'feet', icon: 'boots', description: 'Light boots that keep you moving.',
    value: 40, stackable: false, stats: { DEF: 2, SPD: 5 },
  },
  chest_leather: {
    id: 'chest_leather', name: 'Leather Chest', type: 'armor', subtype: 'chest',
    slot: 'chest', icon: 'chest', description: 'Supple leather chest piece.',
    value: 80, stackable: false, stats: { DEF: 4 },
  },
  helm_iron: {
    id: 'helm_iron', name: 'Iron Helm', type: 'armor', subtype: 'head',
    slot: 'head', icon: 'helmet', description: 'A sturdy iron helmet.',
    value: 70, stackable: false, stats: { DEF: 3 },
  },
  ring_ward: {
    id: 'ring_ward', name: 'Ring of Warding', type: 'armor', subtype: 'ring',
    slot: 'ring1', icon: 'ring', description: 'Enchanted to bolster defense.',
    value: 200, stackable: false, stats: { DEF: 2, CON: 1 },
  },
  guild_robe_apprentice: {
    id: 'guild_robe_apprentice', name: "Apprentice's Robe", type: 'armor', subtype: 'chest',
    slot: 'chest', icon: 'chest', description: 'The robes of a guild initiate.',
    value: 180, stackable: false, stats: { DEF: 2, INT: 3 },
  },
  chest_chain: {
    id: 'chest_chain', name: 'Chain Mail', type: 'armor', subtype: 'chest',
    slot: 'chest', icon: 'chest', description: 'Interlocked steel rings offer solid protection.',
    value: 160, stackable: false, stats: { DEF: 6 },
  },
  legs_leather: {
    id: 'legs_leather', name: 'Leather Greaves', type: 'armor', subtype: 'legs',
    slot: 'legs', icon: 'chest', description: 'Protective leg coverings.',
    value: 60, stackable: false, stats: { DEF: 3 },
  },
  neck_amulet_focus: {
    id: 'neck_amulet_focus', name: 'Amulet of Focus', type: 'armor', subtype: 'neck',
    slot: 'neck', icon: 'necklace', description: 'Sharpens the mind and enhances spellcasting.',
    value: 250, stackable: false, stats: { INT: 2, WIS: 2 },
  },

  // ===== CONSUMABLES =====
  health_potion: {
    id: 'health_potion', name: 'Health Potion', type: 'consumable',
    slot: null, icon: 'potion', description: 'Restores 30 HP.',
    value: 20, stackable: true, maxStack: 20,
    effect: { type: 'heal', amount: 30 },
  },
  health_potion_large: {
    id: 'health_potion_large', name: 'Large Health Potion', type: 'consumable',
    slot: null, icon: 'potion', description: 'Restores 75 HP.',
    value: 50, stackable: true, maxStack: 10,
    effect: { type: 'heal', amount: 75 },
  },
  elixir_magic: {
    id: 'elixir_magic', name: 'Mana Elixir', type: 'consumable',
    slot: null, icon: 'potion', description: 'Restores 20 MP.',
    value: 25, stackable: true, maxStack: 20,
    effect: { type: 'mp_restore', amount: 20 },
  },
  bread: {
    id: 'bread', name: 'Bread', type: 'consumable',
    slot: null, icon: 'food', description: 'Simple but filling. Restores 8 HP.',
    value: 5, stackable: true, maxStack: 30,
    effect: { type: 'heal', amount: 8 },
  },
  antidote: {
    id: 'antidote', name: 'Antidote', type: 'consumable',
    slot: null, icon: 'potion', description: 'Cures poison.',
    value: 15, stackable: true, maxStack: 20,
    effect: { type: 'cure_poison' },
  },

  // ===== MATERIALS =====
  iron_ore: {
    id: 'iron_ore', name: 'Iron Ore', type: 'material',
    slot: null, icon: 'ore', description: 'Raw iron ore from the mine.',
    value: 8, stackable: true, maxStack: 50,
  },
  swamp_lotus: {
    id: 'swamp_lotus', name: 'Swamp Lotus', type: 'material',
    slot: null, icon: 'herb', description: 'A rare herb found in Hollowmire.',
    value: 15, stackable: true, maxStack: 30,
  },
  bone_fragment: {
    id: 'bone_fragment', name: 'Bone Fragment', type: 'material',
    slot: null, icon: 'ore', description: 'Remains of the undead. Used in alchemical work.',
    value: 3, stackable: true, maxStack: 50,
  },
  mire_scale: {
    id: 'mire_scale', name: 'Mire Scale', type: 'material',
    slot: null, icon: 'ore', description: 'Scales from a Mire Crawler. Durable and flexible.',
    value: 12, stackable: true, maxStack: 30,
  },
  hollow_crystal: {
    id: 'hollow_crystal', name: 'Hollow Crystal', type: 'material',
    slot: null, icon: 'ore', description: 'A crystal pulsing with strange energy. Someone will want this.',
    value: 40, stackable: true, maxStack: 10,
  },

  // ===== QUEST ITEMS =====
  catacombs_relic: {
    id: 'catacombs_relic', name: 'Catacombs Relic', type: 'quest',
    slot: null, icon: 'scroll', description: 'An ancient artifact recovered from the Catacombs.',
    value: 0, stackable: false, questItem: true,
  },
  hollowmire_relic: {
    id: 'hollowmire_relic', name: 'Hollowmire Relic', type: 'quest',
    slot: null, icon: 'scroll', description: 'A corrupted artifact from the depths of Hollowmire.',
    value: 0, stackable: false, questItem: true,
  },
  stolen_ale_cask: {
    id: 'stolen_ale_cask', name: 'Stolen Ale Cask', type: 'quest',
    slot: null, icon: 'food', description: 'A cask of Millhaven ale — the innkeeper will be glad to see this.',
    value: 0, stackable: false, questItem: true,
  },
  missing_letter: {
    id: 'missing_letter', name: 'Missing Letter', type: 'quest',
    slot: null, icon: 'scroll', description: 'A sealed letter. It was not meant to fall into these hands.',
    value: 0, stackable: false, questItem: true,
  },
};
