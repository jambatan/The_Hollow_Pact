export const QUEST_DB = {
  // ============= MAIN QUEST =============
  mq_01_shadows: {
    id: 'mq_01_shadows',
    name: 'Shadows of Ashenvale',
    description: 'Captain Aldric asks you to investigate strange undead activity in the Catacombs beneath Ashenvale.',
    giverNpcId: 'captain_aldric',
    stages: [
      {
        title: 'Enter the Catacombs',
        npcId: 'captain_aldric',
        objectives: [
          { type: 'reach', zoneId: 'catacombs_f1', label: 'Enter the Catacombs' }
        ],
        reward: { xp: 50 },
      },
      {
        title: 'Defeat the Bone Warden',
        objectives: [
          { type: 'kill', enemyId: 'bone_warden', count: 1, label: 'Defeat the Bone Warden (0/1)' }
        ],
        reward: { xp: 150, gold: 50, items: { catacombs_relic: 1 } },
      },
      {
        title: 'Report to Captain Aldric',
        npcId: 'captain_aldric',
        objectives: [
          { type: 'talk', npcId: 'captain_aldric', label: 'Return to Captain Aldric' }
        ],
        reward: { xp: 100, gold: 80 },
      },
    ],
  },

  mq_02_source: {
    id: 'mq_02_source',
    name: 'The Ancient Seal',
    description: 'Scholar Emelyn in Millhaven believes the relic you found is linked to an ancient seal. She needs a Hollowmire Relic to confirm.',
    giverNpcId: 'scholar_emelyn',
    stages: [
      {
        title: 'Bring Scholar Emelyn the Catacombs Relic',
        npcId: 'scholar_emelyn',
        objectives: [
          { type: 'fetch', itemId: 'catacombs_relic', count: 1, label: 'Bring the Catacombs Relic to Emelyn' }
        ],
        reward: { xp: 75 },
      },
      {
        title: 'Fetch the Hollowmire Relic',
        objectives: [
          { type: 'reach', zoneId: 'hollowmire_f1', label: 'Enter Hollowmire' },
          { type: 'fetch', itemId: 'hollowmire_relic', count: 1, label: 'Obtain the Hollowmire Relic' }
        ],
        reward: { xp: 200, gold: 100 },
      },
    ],
  },

  mq_03_mage_trial: {
    id: 'mq_03_mage_trial',
    name: 'The Mage Guild Trial',
    description: 'Archmage Thalys requires you to prove yourself by completing the guild trial puzzle.',
    giverNpcId: 'archmage_thalys',
    stages: [
      {
        title: 'Complete the Trial of the Seals',
        npcId: 'mage_proctor_venn',
        objectives: [
          { type: 'puzzle', puzzleId: 'mage_guild_trial', label: 'Complete the Mage Guild trial puzzle' }
        ],
        reward: { xp: 150, gold: 50 },
      },
    ],
  },

  mq_04_hollowmire: {
    id: 'mq_04_hollowmire',
    name: 'The Hollow Pact',
    description: 'Armed with knowledge of the ancient seal, Archmage Thalys sends you into Hollowmire to defeat the Mireborn Ancient and break the pact.',
    giverNpcId: 'archmage_thalys',
    stages: [
      {
        title: 'Defeat the Mireborn Ancient',
        objectives: [
          { type: 'kill', enemyId: 'mireborn_ancient', count: 1, label: 'Defeat the Mireborn Ancient' }
        ],
        reward: { xp: 400, gold: 200 },
      },
      {
        title: 'Return to Archmage Thalys',
        npcId: 'archmage_thalys',
        objectives: [
          { type: 'talk', npcId: 'archmage_thalys', label: 'Report to Archmage Thalys' }
        ],
        reward: { xp: 300, gold: 300, items: { neck_amulet_focus: 1 } },
      },
    ],
  },

  // ============= SIDE QUESTS =============
  sq_ash_01_ore: {
    id: 'sq_ash_01_ore',
    name: "Dorin's Supply Run",
    description: 'The blacksmith Dorin needs iron ore from the Catacombs. Bring him 5 iron ore.',
    giverNpcId: 'blacksmith_dorin',
    stages: [
      {
        title: 'Collect Iron Ore',
        npcId: 'blacksmith_dorin',
        objectives: [
          { type: 'fetch', itemId: 'iron_ore', count: 5, label: 'Collect Iron Ore (0/5)' }
        ],
        reward: { xp: 60, gold: 30, items: { sword_iron: 1 } },
      },
    ],
  },

  sq_ash_02_missing_guard: {
    id: 'sq_ash_02_missing_guard',
    name: 'The Missing Guard',
    description: "One of Aldric's guards went into the Catacombs and hasn't returned. Find out what happened.",
    giverNpcId: 'captain_aldric',
    stages: [
      {
        title: 'Find the Missing Guard',
        objectives: [
          { type: 'kill', enemyIds: ['zombie', 'skeleton_warrior', 'skeleton_archer'], count: 5, label: 'Clear the undead (0/5)' },
          { type: 'reach', zoneId: 'catacombs_f2', label: 'Reach the second floor' }
        ],
        reward: { xp: 80, gold: 50 },
      },
    ],
  },

  sq_ash_03_inn_ale: {
    id: 'sq_ash_03_inn_ale',
    name: "The Innkeeper's Ale",
    description: "Mira's shipment of Millhaven ale was stolen. Bandits were spotted near Riverbow. Recover the stolen cask.",
    giverNpcId: 'innkeeper_mira',
    stages: [
      {
        title: 'Recover the Stolen Ale',
        npcId: 'innkeeper_mira',
        objectives: [
          { type: 'fetch', itemId: 'stolen_ale_cask', count: 1, label: 'Recover the stolen ale cask' }
        ],
        reward: { xp: 70, gold: 40 },
      },
    ],
  },

  sq_ash_04_escort: {
    id: 'sq_ash_04_escort',
    name: "Bram's Caravan",
    description: "Merchant Bram needs a capable escort to travel safely to Millhaven.",
    giverNpcId: 'merchant_bram',
    stages: [
      {
        title: 'Escort Bram to Millhaven',
        escortNpcId: 'merchant_bram',
        escortNpcName: 'Bram',
        allowedZones: ['riverbow', 'world_map', 'millhaven'],
        offRouteLimit: 3,
        escortDestX: 23*16, escortDestY: 28*16,    // market square stall position
        escortDestDialogue: 'merchant_bram_millhaven',
        objectives: [
          { type: 'reach', zoneId: 'millhaven', label: 'Reach Millhaven with Bram' }
        ],
        reward: { xp: 80, gold: 60 },
      },
    ],
  },

  sq_mill_01_herbs: {
    id: 'sq_mill_01_herbs',
    name: "Selene's Herbs",
    description: 'Apothecary Selene needs Swamp Lotus from Hollowmire for a cure. Bring her 3 swamp lotuses.',
    giverNpcId: 'apothecary_selene',
    stages: [
      {
        title: 'Gather Swamp Lotus',
        npcId: 'apothecary_selene',
        objectives: [
          { type: 'fetch', itemId: 'swamp_lotus', count: 3, label: 'Gather Swamp Lotus (0/3)' }
        ],
        reward: { xp: 90, items: { health_potion_large: 3, elixir_magic: 2 } },
      },
    ],
  },

  sq_mill_02_mage_trial_proctor: {
    id: 'sq_mill_02_mage_trial_proctor',
    name: 'Proctor Venn\'s Challenge',
    description: 'Proctor Venn of the Mage Guild offers a side trial for those seeking deeper understanding.',
    giverNpcId: 'mage_proctor_venn',
    stages: [
      {
        title: 'Complete the Side Trial',
        objectives: [
          { type: 'kill', enemyId: 'goblin', count: 8, label: 'Defeat goblins (0/8)' }
        ],
        reward: { xp: 100, items: { staff_apprentice: 1 } },
      },
    ],
  },

  sq_farm_01_son: {
    id: 'sq_farm_01_son',
    name: "Hess's Missing Son",
    description: "Farmer Hess's son Torin wandered into Hollowmire. Find him and bring him home.",
    giverNpcId: 'farmer_hess',
    stages: [
      {
        title: "Find Torin in Hollowmire",
        objectives: [
          { type: 'reach', zoneId: 'hollowmire_f1', label: 'Enter Hollowmire' },
          { type: 'kill', enemyId: 'mire_crawler', count: 3, label: 'Clear the path (0/3)' }
        ],
        reward: { xp: 100, gold: 60 },
      },
    ],
  },

  sq_farm_02_swamp: {
    id: 'sq_farm_02_swamp',
    name: 'The Swamp Threat',
    description: 'Mire Crawlers from Hollowmire are encroaching on the Kettridge farm. Kill 8 of them.',
    giverNpcId: 'farmer_hess',
    stages: [
      {
        title: 'Cull the Mire Crawlers',
        npcId: 'farmer_hess',
        objectives: [
          { type: 'kill', enemyId: 'mire_crawler', count: 8, label: 'Kill Mire Crawlers (0/8)' }
        ],
        reward: { xp: 110, gold: 70 },
      },
    ],
  },

  sq_river_01_bandits: {
    id: 'sq_river_01_bandits',
    name: 'Bandit Patrol',
    description: "Ranger Sela at Riverbow has spotted a bandit patrol. Clear them out.",
    giverNpcId: 'ranger_sela',
    stages: [
      {
        title: 'Eliminate the Bandits',
        npcId: 'ranger_sela',
        objectives: [
          { type: 'kill', enemyId: 'bandit', count: 5, label: 'Kill bandits (0/5)' }
        ],
        reward: { xp: 90, gold: 55 },
      },
    ],
  },

  sq_river_02_trader: {
    id: 'sq_river_02_trader',
    name: "The Stolen Goods",
    description: 'A traveling trader lost his letter to bandits. Recover it from the bandit camp near Riverbow.',
    giverNpcId: 'merchant_bram',
    stages: [
      {
        title: 'Recover the Missing Letter',
        npcId: 'merchant_bram',
        objectives: [
          { type: 'fetch', itemId: 'missing_letter', count: 1, label: 'Recover the missing letter' }
        ],
        reward: { xp: 70, gold: 45 },
      },
    ],
  },
};
