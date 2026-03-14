// Auto-saved by RPG dev tools
export const ENEMY_DB = {
  "skeleton_warrior": {
    "id": "skeleton_warrior",
    "name": "Skeleton Warrior",
    "sprite": "skeleton",
    "aiType": "chase",
    "aggroRange": 80,
    "attackRange": 16,
    "attackSpeed": 1.8,
    "stats": {
      "STR": 6,
      "DEX": 4,
      "INT": 1,
      "CON": 5,
      "WIS": 1,
      "CHA": 1
    },
    "dropTable": [
      {
        "itemId": "bone_fragment",
        "chance": 0.5,
        "qty": 1
      },
      {
        "itemId": "iron_ore",
        "chance": 0.15,
        "qty": 1
      }
    ],
    "goldRange": [
      3,
      10
    ],
    "xpReward": 18,
    "level": 1,
    "lootTableIds": [
      "undead_common",
      "random equipment rare"
    ]
  },
  "skeleton_archer": {
    "id": "skeleton_archer",
    "name": "Skeleton Archer",
    "sprite": "skeleton",
    "aiType": "ranged",
    "aggroRange": 120,
    "attackRange": 100,
    "attackSpeed": 2.2,
    "stats": {
      "STR": 4,
      "DEX": 7,
      "INT": 1,
      "CON": 4,
      "WIS": 1,
      "CHA": 1
    },
    "dropTable": [
      {
        "itemId": "bone_fragment",
        "chance": 0.4,
        "qty": 1
      }
    ],
    "goldRange": [
      2,
      8
    ],
    "xpReward": 15,
    "level": 1,
    "lootTableIds": [
      "undead_common",
      "random equipment rare"
    ]
  },
  "zombie": {
    "id": "zombie",
    "name": "Zombie",
    "sprite": "zombie",
    "aiType": "chase",
    "aggroRange": 70,
    "attackRange": 16,
    "attackSpeed": 2.5,
    "stats": {
      "STR": 5,
      "DEX": 2,
      "INT": 1,
      "CON": 8,
      "WIS": 1,
      "CHA": 1
    },
    "dropTable": [
      {
        "itemId": "bone_fragment",
        "chance": 0.6,
        "qty": 1
      }
    ],
    "goldRange": [
      1,
      5
    ],
    "xpReward": 12,
    "level": 1,
    "lootTableIds": [
      "random equipment rare",
      "undead_common"
    ]
  },
  "bone_warden": {
    "id": "bone_warden",
    "name": "Bone Warden",
    "sprite": "skeleton",
    "aiType": "chase",
    "aggroRange": 90,
    "attackRange": 20,
    "attackSpeed": 1.6,
    "stats": {
      "STR": 12,
      "DEX": 5,
      "INT": 3,
      "CON": 15,
      "WIS": 5,
      "CHA": 3
    },
    "dropTable": [
      {
        "itemId": "catacombs_relic",
        "chance": 1,
        "qty": 1
      }
    ],
    "goldRange": [
      20,
      40
    ],
    "xpReward": 80,
    "level": 1,
    "lootTableIds": [
      "undead_common",
      "dungeon_boss",
      "random equipment rare"
    ]
  },
  "goblin": {
    "id": "goblin",
    "name": "Goblin",
    "sprite": "goblin",
    "aiType": "chase",
    "aggroRange": 80,
    "attackRange": 16,
    "attackSpeed": 1.5,
    "stats": {
      "STR": 4,
      "DEX": 6,
      "INT": 2,
      "CON": 3,
      "WIS": 2,
      "CHA": 2
    },
    "dropTable": [
      {
        "itemId": "iron_ore",
        "chance": 0.3,
        "qty": 1
      }
    ],
    "goldRange": [
      2,
      6
    ],
    "xpReward": 10,
    "level": 1,
    "lootTableIds": [
      "random equipment rare"
    ]
  },
  "bandit": {
    "id": "bandit",
    "name": "Bandit",
    "sprite": "bandit",
    "aiType": "chase",
    "aggroRange": 80,
    "attackRange": 16,
    "attackSpeed": 1.7,
    "stats": {
      "STR": 6,
      "DEX": 5,
      "INT": 2,
      "CON": 5,
      "WIS": 3,
      "CHA": 4
    },
    "dropTable": [
      {
        "itemId": "iron_ore",
        "chance": 0.2,
        "qty": 1
      }
    ],
    "goldRange": [
      5,
      15
    ],
    "xpReward": 20,
    "level": 1,
    "lootTableIds": [
      "bandit_common",
      "random equipment rare"
    ],
    "charSheetIdx": 487
  },
  "mire_crawler": {
    "id": "mire_crawler",
    "name": "Mire Crawler",
    "sprite": "mire_crawler",
    "aiType": "chase",
    "aggroRange": 80,
    "attackRange": 16,
    "attackSpeed": 1.9,
    "stats": {
      "STR": 5,
      "DEX": 4,
      "INT": 1,
      "CON": 6,
      "WIS": 1,
      "CHA": 1
    },
    "dropTable": [
      {
        "itemId": "mire_scale",
        "chance": 0.5,
        "qty": 1
      },
      {
        "itemId": "swamp_lotus",
        "chance": 0.15,
        "qty": 1
      }
    ],
    "goldRange": [
      2,
      8
    ],
    "xpReward": 15,
    "level": 1,
    "lootTableIds": [
      "mire_common",
      "random equipment rare"
    ]
  },
  "mire_lurker": {
    "id": "mire_lurker",
    "name": "Mire Lurker",
    "sprite": "mire_crawler",
    "aiType": "chase",
    "aggroRange": 75,
    "attackRange": 18,
    "attackSpeed": 2.1,
    "stats": {
      "STR": 7,
      "DEX": 3,
      "INT": 1,
      "CON": 8,
      "WIS": 2,
      "CHA": 1
    },
    "dropTable": [
      {
        "itemId": "mire_scale",
        "chance": 0.6,
        "qty": 1
      }
    ],
    "goldRange": [
      4,
      12
    ],
    "xpReward": 25,
    "level": 1,
    "lootTableIds": [
      "mire_common",
      "random equipment rare"
    ]
  },
  "mireborn_ancient": {
    "id": "mireborn_ancient",
    "name": "Mireborn Ancient",
    "sprite": "mire_crawler",
    "aiType": "chase",
    "aggroRange": 100,
    "attackRange": 24,
    "attackSpeed": 2,
    "stats": {
      "STR": 15,
      "DEX": 6,
      "INT": 8,
      "CON": 20,
      "WIS": 10,
      "CHA": 5
    },
    "dropTable": [
      {
        "itemId": "hollowmire_relic",
        "chance": 1,
        "qty": 1
      }
    ],
    "goldRange": [
      50,
      100
    ],
    "xpReward": 150,
    "level": 1,
    "lootTableIds": [
      "dungeon_boss",
      "mire_common",
      "random equipment rare"
    ]
  },
  "bandit_spy": {
    "id": "bandit_spy",
    "name": "Bandit",
    "sprite": "bandit",
    "aiType": "chase",
    "aggroRange": 5,
    "attackRange": 16,
    "attackSpeed": 1,
    "stats": {
      "STR": 3,
      "DEX": 5,
      "INT": 3,
      "CON": 3,
      "WIS": 3,
      "CHA": 3
    },
    "dropTable": [
      {
        "itemId": "health_potion_large",
        "chance": 1,
        "qty": 2
      }
    ],
    "goldRange": [
      20,
      50
    ],
    "xpReward": 50,
    "level": 1,
    "lootTableIds": [
      "random equipment rare"
    ]
  }
};
