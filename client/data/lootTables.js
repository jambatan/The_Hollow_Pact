// Shared loot tables — assign to enemies via lootTableId.
// Individual enemy dropTable entries stack on top of the shared table.
export const LOOT_TABLE_DB = {
  "undead_common": {
    "id": "undead_common",
    "name": "Undead Common",
    "drops": [
      {
        "itemId": "bone_fragment",
        "chance": 0.5,
        "qty": 1
      },
      {
        "itemId": "iron_ore",
        "chance": 0.1,
        "qty": 1
      }
    ]
  },
  "mire_common": {
    "id": "mire_common",
    "name": "Mire Common",
    "drops": [
      {
        "itemId": "mire_scale",
        "chance": 0.5,
        "qty": 1
      },
      {
        "itemId": "swamp_lotus",
        "chance": 0.12,
        "qty": 1
      }
    ]
  },
  "bandit_common": {
    "id": "bandit_common",
    "name": "Bandit Common",
    "drops": [
      {
        "itemId": "iron_ore",
        "chance": 0.2,
        "qty": 1
      },
      {
        "itemId": "missing_letter",
        "chance": 0.08,
        "qty": 1
      }
    ]
  },
  "dungeon_boss": {
    "id": "dungeon_boss",
    "name": "Dungeon Boss",
    "drops": [
      {
        "itemId": "bone_fragment",
        "chance": 1,
        "qty": 3
      },
      {
        "itemId": "iron_ore",
        "chance": 0.8,
        "qty": 2
      }
    ]
  },
  "random equipment rare": {
    "id": "random equipment rare",
    "name": "random_equipment_rare",
    "drops": [
      {
        "itemId": "sword_iron",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "sword_reinforced_iron",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "dagger_steel",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "staff_apprentice",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "bow_shortbow",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "axe_woodcutters",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "boots_leather",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "chest_leather",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "helm_iron",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "legs_leather",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "ring_ward",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "chest_chain",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "legs_leather",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "neck_amulet_focus",
        "chance": 0.03,
        "qty": 1
      },
      {
        "itemId": "guild_robe_apprentice",
        "chance": 0.03,
        "qty": 1
      }
    ]
  }
};
