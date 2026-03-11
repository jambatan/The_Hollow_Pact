// Auto-saved by RPG dev tools
export const NPC_DB = {
  "captain_aldric": {
    "id": "captain_aldric",
    "name": "Captain Aldric",
    "sprite": "guard",
    "dialogueTree": "captain_aldric_default",
    "questGiver": [
      "mq_01_shadows",
      "sq_ash_02_missing_guard"
    ],
    "shopId": null,
    "combatBehavior": "guard",
    "guardRange": 160,
    "combatStats": {
      "STR": 8,
      "DEX": 6,
      "INT": 3,
      "CON": 8,
      "WIS": 4,
      "CHA": 6
    },
    "schedule": [
      {
        "timeStart": 6,
        "timeEnd": 22,
        "x": 480,
        "y": 480,
        "state": "idle"
      },
      {
        "timeStart": 22,
        "timeEnd": 6,
        "x": 240,
        "y": 640,
        "state": "sleep"
      }
    ],
    "charSheetIdx": 595,
    "fleeRange": 120
  },
  "innkeeper_mira": {
    "id": "innkeeper_mira",
    "name": "Innkeeper Mira",
    "sprite": "innkeeper",
    "dialogueTree": "innkeeper_mira_default",
    "questGiver": [
      "sq_ash_03_inn_ale"
    ],
    "shopId": "ashenvale_inn",
    "combatBehavior": "coward",
    "fleeRange": 100,
    "schedule": [
      {
        "timeStart": 7,
        "timeEnd": 23,
        "x": 400,
        "y": 192,
        "state": "idle"
      },
      {
        "timeStart": 23,
        "timeEnd": 7,
        "x": 400,
        "y": 176,
        "state": "sleep"
      }
    ],
    "charSheetIdx": 486,
    "guardRange": 150
  },
  "blacksmith_dorin": {
    "id": "blacksmith_dorin",
    "name": "Blacksmith Dorin",
    "sprite": "blacksmith",
    "dialogueTree": "blacksmith_dorin_default",
    "questGiver": [
      "sq_ash_01_ore"
    ],
    "shopId": "ashenvale_blacksmith",
    "schedule": [
      {
        "timeStart": 8,
        "timeEnd": 18,
        "x": 192,
        "y": 480,
        "state": "idle"
      },
      {
        "timeStart": 18,
        "timeEnd": 8,
        "x": 288,
        "y": 448,
        "state": "sleep"
      }
    ],
    "charSheetIdx": 325
  },
  "shopkeeper_kepler": {
    "id": "shopkeeper_kepler",
    "name": "Shopkeeper Kepler",
    "sprite": "merchant",
    "dialogueTree": "shopkeeper_kepler_default",
    "questGiver": [],
    "shopId": "ashenvale_general",
    "combatBehavior": "coward",
    "fleeRange": 100,
    "schedule": [
      {
        "timeStart": 9,
        "timeEnd": 20,
        "x": 768,
        "y": 448,
        "state": "idle"
      },
      {
        "timeStart": 20,
        "timeEnd": 9,
        "x": 768,
        "y": 416,
        "state": "sleep"
      }
    ],
    "charSheetIdx": 541,
    "guardRange": 150
  },
  "merchant_bram": {
    "id": "merchant_bram",
    "name": "Merchant Bram",
    "sprite": "merchant",
    "dialogueTree": "merchant_bram_default",
    "questGiver": [
      "sq_ash_04_escort",
      "sq_river_02_trader"
    ],
    "shopId": "bram_millhaven_stall",
    "combatBehavior": "coward",
    "fleeRange": 110,
    "schedule": [
      {
        "timeStart": 8,
        "timeEnd": 22,
        "x": 480,
        "y": 544,
        "state": "idle"
      },
      {
        "timeStart": 22,
        "timeEnd": 8,
        "x": 512,
        "y": 560,
        "state": "sleep"
      }
    ]
  },
  "scholar_emelyn": {
    "id": "scholar_emelyn",
    "name": "Scholar Emelyn",
    "sprite": "scholar",
    "dialogueTree": "scholar_emelyn_default",
    "questGiver": [
      "mq_02_source",
      "mq_03_mage_trial"
    ],
    "shopId": null,
    "schedule": [
      {
        "timeStart": 8,
        "timeEnd": 20,
        "x": 480,
        "y": 320,
        "state": "idle"
      },
      {
        "timeStart": 20,
        "timeEnd": 8,
        "x": 512,
        "y": 320,
        "state": "sleep"
      }
    ]
  },
  "archmage_thalys": {
    "id": "archmage_thalys",
    "name": "Archmage Thalys",
    "sprite": "mage",
    "dialogueTree": "archmage_thalys_default",
    "questGiver": [
      "mq_04_hollowmire"
    ],
    "shopId": null,
    "schedule": [
      {
        "timeStart": 9,
        "timeEnd": 19,
        "x": 448,
        "y": 352,
        "state": "idle"
      },
      {
        "timeStart": 19,
        "timeEnd": 9,
        "x": 432,
        "y": 320,
        "state": "sleep"
      }
    ]
  },
  "apothecary_selene": {
    "id": "apothecary_selene",
    "name": "Apothecary Selene",
    "sprite": "healer",
    "dialogueTree": "apothecary_selene_default",
    "questGiver": [
      "sq_mill_01_herbs"
    ],
    "shopId": "millhaven_apothecary",
    "schedule": [
      {
        "timeStart": 8,
        "timeEnd": 19,
        "x": 688,
        "y": 448,
        "state": "idle"
      },
      {
        "timeStart": 19,
        "timeEnd": 8,
        "x": 688,
        "y": 464,
        "state": "sleep"
      }
    ]
  },
  "mage_proctor_venn": {
    "id": "mage_proctor_venn",
    "name": "Mage Proctor Venn",
    "sprite": "mage",
    "dialogueTree": "mage_proctor_venn_default",
    "questGiver": [
      "sq_mill_02_mage_trial_proctor"
    ],
    "shopId": null,
    "schedule": [
      {
        "timeStart": 10,
        "timeEnd": 18,
        "x": 512,
        "y": 352,
        "state": "idle"
      },
      {
        "timeStart": 18,
        "timeEnd": 10,
        "x": 528,
        "y": 320,
        "state": "sleep"
      }
    ]
  },
  "farmer_hess": {
    "id": "farmer_hess",
    "name": "Farmer Hess",
    "sprite": "farmer",
    "dialogueTree": "farmer_hess_default",
    "questGiver": [
      "sq_farm_01_son",
      "sq_farm_02_swamp"
    ],
    "shopId": null,
    "schedule": [
      {
        "timeStart": 7,
        "timeEnd": 18,
        "x": 320,
        "y": 240,
        "state": "idle"
      },
      {
        "timeStart": 18,
        "timeEnd": 7,
        "x": 288,
        "y": 192,
        "state": "sleep"
      }
    ]
  },
  "tavern_brawler": {
    "id": "tavern_brawler",
    "name": "Rogan",
    "sprite": "fighter",
    "dialogueTree": "tavern_brawler_default",
    "questGiver": [],
    "shopId": null,
    "combatStats": {
      "STR": 12,
      "DEX": 6,
      "CON": 10,
      "INT": 2,
      "WIS": 2,
      "CHA": 5
    },
    "schedule": [
      {
        "timeStart": 10,
        "timeEnd": 24,
        "x": 608,
        "y": 240,
        "state": "idle"
      },
      {
        "timeStart": 0,
        "timeEnd": 10,
        "x": 416,
        "y": 176,
        "state": "sleep"
      }
    ]
  },
  "tavern_thief": {
    "id": "tavern_thief",
    "name": "Pip",
    "sprite": "thief",
    "dialogueTree": "tavern_thief_inn",
    "questGiver": [],
    "shopId": null,
    "combatStats": {
      "STR": 5,
      "DEX": 14,
      "CON": 4,
      "INT": 6,
      "WIS": 3,
      "CHA": 8
    },
    "schedule": [
      { "timeStart": 10, "timeEnd": 24, "x": 576, "y": 256, "state": "idle" },
      { "timeStart": 0,  "timeEnd": 10, "x": 576, "y": 240, "state": "sleep" }
    ]
  },
  "party_healer": {
    "id": "party_healer",
    "name": "Nara",
    "sprite": "healer",
    "dialogueTree": "party_healer_inn",
    "questGiver": [],
    "shopId": null,
    "combatStats": {
      "STR": 3,
      "DEX": 6,
      "CON": 8,
      "INT": 5,
      "WIS": 10,
      "CHA": 7
    },
    "schedule": [
      { "timeStart": 8,  "timeEnd": 22, "x": 544, "y": 272, "state": "idle" },
      { "timeStart": 22, "timeEnd": 8,  "x": 544, "y": 256, "state": "sleep" }
    ]
  },
  "ranger_sela": {
    "id": "ranger_sela",
    "name": "Ranger Sela",
    "sprite": "ranger",
    "dialogueTree": "ranger_sela_default",
    "questGiver": [
      "sq_river_01_bandits"
    ],
    "shopId": null,
    "schedule": [
      {
        "timeStart": 6,
        "timeEnd": 22,
        "x": 400,
        "y": 288,
        "state": "idle"
      },
      {
        "timeStart": 22,
        "timeEnd": 6,
        "x": 400,
        "y": 288,
        "state": "sleep"
      }
    ],
    "charSprite": {
      "base": 1,
      "layers": [
        {
          "idx": 508,
          "mirror": false
        },
        {
          "idx": 385,
          "mirror": false
        },
        {
          "idx": 57,
          "mirror": false
        },
        {
          "idx": 368,
          "mirror": false
        },
        {
          "idx": 530,
          "mirror": true
        }
      ]
    },
    "combatStats": {
      "STR": 8,
      "DEX": 10,
      "INT": 4,
      "CON": 6,
      "WIS": 5,
      "CHA": 4
    },
    "combatBehavior": "guard",
    "guardRange": 150,
    "fleeRange": 120
  }
};
