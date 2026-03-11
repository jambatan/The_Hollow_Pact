export const DIALOGUE_DB = {

  // ===== ASHENVALE =====

  captain_aldric_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Captain Aldric',
        text: "Adventurer. These are troubled times. The graveyard stirs at night and my guards report movement in the old Catacombs. I need someone capable.",
        choices: [
          { text: "Tell me about the Catacombs.", action: 'goto', target: 'catacombs_info' },
          { text: "I'll investigate.", action: 'quest_offer', questId: 'mq_01_shadows' },
          { text: "Any missing guard reports?", action: 'quest_offer', questId: 'sq_ash_02_missing_guard' },
          { text: "Goodbye.", action: 'close' },
        ],
      },
      catacombs_info: {
        speaker: 'Captain Aldric',
        text: "The Catacombs run beneath the old cemetery north of town. They've been sealed for years. Whatever has opened them — it isn't natural.",
        choices: [
          { text: "I'll look into it.", action: 'quest_offer', questId: 'mq_01_shadows' },
          { text: "Goodbye.", action: 'close' },
        ],
      },
    },
  },

  innkeeper_mira_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Mira Coldbrook',
        text: "Welcome to the Hearth & Hound! Need a room, provisions, or information?",
        choices: [
          { text: "I'd like to rest. (10 gold — full HP/MP)", action: 'rest' },
          { text: "Show me your supplies.", action: 'open_shop' },
          { text: "About that missing ale shipment...", action: 'quest_offer', questId: 'sq_ash_03_inn_ale' },
          { text: "What's new in town?", action: 'goto', target: 'rumors' },
          { text: "Nothing, thanks.", action: 'close' },
        ],
      },
      rumors: {
        speaker: 'Mira Coldbrook',
        text: "Dorin the blacksmith is short on supplies. That merchant Bram stopped at the Riverbow camp — heading to Millhaven but grumbling about a stolen letter. Also — Captain Aldric looks grim. Whatever's happening, it's not good.",
        choices: [{ text: "Thanks.", action: 'close' }],
      },
    },
  },

  blacksmith_dorin_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Dorin the Smith',
        text: "Aye, what'll it be? I buy and sell arms. Got some work too, if you're the adventuring type.",
        choices: [
          { text: "Let me see your wares.", action: 'open_shop' },
          { text: "What kind of work?", action: 'quest_offer', questId: 'sq_ash_01_ore' },
          { text: "Nothing today.", action: 'close' },
        ],
      },
    },
  },

  shopkeeper_kepler_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Kepler',
        text: "Finest supplies this side of Millhaven! Take a look.",
        choices: [
          { text: "Show me your stock.", action: 'open_shop' },
          { text: "Maybe later.", action: 'close' },
        ],
      },
    },
  },

  merchant_bram_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Bram the Trader',
        text: "Heading to Millhaven soon. Wouldn't mind some company — bandits have been bold lately. Busy times for a trader!",
        choices: [
          { text: "I'll escort you to Millhaven.", action: 'quest_offer', questId: 'sq_ash_04_escort' },
          { text: "Lost something?", action: 'quest_offer', questId: 'sq_river_02_trader' },
          { text: "What do you trade?", action: 'goto', target: 'trade_chat' },
          { text: "Safe travels.", action: 'close' },
        ],
      },
      trade_chat: {
        speaker: 'Bram the Trader',
        text: "Bit of everything — potions, blades, materials. Once I'm set up in Millhaven I'll have proper stock. Right now I'm travelling light.",
        choices: [
          { text: "Good luck with the stall.", action: 'close' },
        ],
      },
    },
  },

  merchant_bram_millhaven: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Bram the Trader',
        text: "Made it in one piece, thanks to you! Stall's set up right here in the market. Good selection today — take a look.",
        choices: [
          { text: "Browse your wares.", action: 'open_shop' },
          { text: "How's business?", action: 'goto', target: 'business' },
          { text: "Heard any news?", action: 'goto', target: 'rumors' },
          { text: "Stay safe, Bram.", action: 'close' },
        ],
      },
      business: {
        speaker: 'Bram the Trader',
        text: "Picking up already! The Mage Guild folks buy a surprising amount of potions. I heard there's trouble down in Hollowmire — something old woke up. Staying well clear myself.",
        choices: [
          { text: "Wise. Good luck.", action: 'close' },
        ],
      },
      rumors: {
        speaker: 'Bram the Trader',
        text: "Word around the market: the apothecary Selene is desperate for Swamp Lotus. And Scholar Emelyn's been asking about ancient relics. There's coin to be made if you're brave enough.",
        choices: [
          { text: "I'll keep my eyes open.", action: 'close' },
        ],
      },
    },
  },

  // ===== MILLHAVEN =====

  scholar_emelyn_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Scholar Emelyn',
        text: "Ah, an adventurer! I've been studying ancient seal magic. If you've recovered anything unusual from the Catacombs, I'd very much like to see it.",
        choices: [
          { text: "I found something in the Catacombs.", action: 'quest_offer', questId: 'mq_02_source' },
          { text: "What can you tell me about Hollowmire?", action: 'goto', target: 'hollowmire_info' },
          { text: "Just browsing.", action: 'close' },
        ],
      },
      hollowmire_info: {
        speaker: 'Scholar Emelyn',
        text: "Hollowmire is a corrupted swamp to the south. Old texts speak of a pact sealed there — something old, very old, was imprisoned. I fear the seals are weakening.",
        choices: [{ text: "Concerning. Thank you.", action: 'close' }],
      },
    },
  },

  archmage_thalys_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Archmage Thalys',
        text: "The seals are failing. The Hollow Pact stirs. If you wish to help, you must first prove yourself worthy — pass the guild trial.",
        choices: [
          { text: "I'm ready for the trial.", action: 'quest_offer', questId: 'mq_03_mage_trial' },
          { text: "Tell me more about the Hollow Pact.", action: 'goto', target: 'pact_info' },
          { text: "I've completed the trial.", action: 'quest_offer', questId: 'mq_04_hollowmire' },
          { text: "Not yet.", action: 'close' },
        ],
      },
      pact_info: {
        speaker: 'Archmage Thalys',
        text: "Centuries ago, the Mireborn Ancient was sealed beneath Hollowmire by ancient mages. The pact bound it there. Now something has disrupted the seals. If it breaks free... I shudder to think.",
        choices: [{ text: "I'll stop it.", action: 'close' }],
      },
    },
  },

  apothecary_selene_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Selene the Healer',
        text: "Welcome! I stock the finest remedies. I'm also in desperate need of Swamp Lotus — do you venture near Hollowmire?",
        choices: [
          { text: "Browse remedies.", action: 'open_shop' },
          { text: "I can gather Swamp Lotus.", action: 'quest_offer', questId: 'sq_mill_01_herbs' },
          { text: "Not today.", action: 'close' },
        ],
      },
    },
  },

  mage_proctor_venn_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Proctor Venn',
        text: "Aspiring to join the guild? Or perhaps just passing through? I have a challenge for the capable.",
        choices: [
          { text: "Tell me about the challenge.", action: 'quest_offer', questId: 'sq_mill_02_mage_trial_proctor' },
          { text: "Not today.", action: 'close' },
        ],
      },
    },
  },

  // ===== ESCORT WARNINGS =====

  escort_warning_mild: {
    root: 'warn',
    nodes: {
      warn: {
        speaker: null, // replaced with NPC name at runtime
        text: "Hold on — this isn't the way to Millhaven. You're going the wrong direction. Turn around before we get completely lost.",
        choices: [
          { text: "You're right, back to the road.", action: 'close' },
          { text: "I know a shortcut, trust me.", action: 'close' },
        ],
      },
    },
  },

  escort_warning_urgent: {
    root: 'warn',
    nodes: {
      warn: {
        speaker: null,
        text: "I'm telling you one last time — Millhaven is NOT this way. Keep heading in the wrong direction and I'm turning back home. I didn't hire you to get me killed.",
        choices: [
          { text: "Alright! We're going back now.", action: 'close' },
        ],
      },
    },
  },

  escort_abandoned: {
    root: 'warn',
    nodes: {
      warn: {
        speaker: null,
        text: "That's it. I've had enough. I'm heading back to Ashenvale — find me there if you change your mind about this job.",
        choices: [
          { text: "...Fair enough.", action: 'close' },
        ],
      },
    },
  },

  // ===== ASHENVALE INN — BRAWL RECRUITS =====

  tavern_brawler_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Rogan',
        text: "Oi! You — yeah, you! Think you're tough? I've knocked out three men tonight already. Buy me a drink... or prove you're worth talking to.",
        choices: [
          { text: "Let's settle this outside... or right here.", action: 'goto', target: 'challenge' },
          { text: "Not interested in trouble.", action: 'close' },
        ],
      },
      challenge: {
        speaker: 'Rogan',
        text: "Ha! I like your spirit. Fists only — last one standing buys the round. No hard feelings after. Ready?",
        choices: [
          { text: "Let's go!", action: 'start_brawl' },
          { text: "Changed my mind.", action: 'close' },
        ],
      },
    },
  },

  tavern_brawler_ko: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Rogan',
        text: "*groans* ..Fair hit. Watch yourself — someone just tried to rifle through my pack. And that healer's been watching you since round two.",
        choices: [
          { text: "I see them! (the thief)", action: 'close' },
          { text: "The healer?", action: 'goto', target: 'nara_hint' },
        ],
      },
      nara_hint: {
        speaker: 'Rogan',
        text: "Nara. She patches people up and asks questions later. Been drifting through here a few days. Worth talking to.",
        choices: [{ text: "Got it. Thanks, Rogan.", action: 'close' }],
      },
    },
  },

  tavern_brawler_draw: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Rogan',
        text: "Hah! We're both half-dead and grinning like fools. I haven't had a fight like that in years! You've got something. Where are you headed?",
        choices: [
          { text: "Somewhere dangerous, probably.", action: 'goto', target: 'invite' },
          { text: "Thanks for the brawl.", action: 'close' },
        ],
      },
      invite: {
        speaker: 'Rogan',
        text: "Dangerous! Perfect. I've got nothing keeping me here but bar tabs. Let me come along — I'll watch your back. And maybe crack a few skulls.",
        choices: [
          { text: "You're in, Rogan.", action: 'join_party' },
          { text: "I work alone.", action: 'close' },
        ],
      },
    },
  },

  tavern_brawler_joined: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Rogan',
        text: "Still in one piece? Good. Point me at something that needs hitting and I'll handle it.",
        choices: [
          { text: "Glad to have you.", action: 'close' },
          { text: "Think you could vouch for Pip and Nara?", action: 'goto', target: 'vouch_prompt' },
        ],
      },
      vouch_prompt: {
        speaker: 'Rogan',
        text: "Pip's a slippery rascal but solid when it counts. Nara? Best healer I've seen in a bar fight. Go tell 'em old Rogan says you're worth trusting.",
        choices: [
          { text: "Will do.", action: 'vouch_others' },
          { text: "Maybe later.", action: 'close' },
        ],
      },
    },
  },

  // Pip at the inn before any brawl — suspicious but not recruitable yet
  tavern_thief_inn: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Pip',
        text: "Keep walking. I'm just... people-watching. Yes. That's what I'm doing.",
        choices: [
          { text: "Alright then.", action: 'close' },
          { text: "You look suspicious.", action: 'goto', target: 'deflect' },
        ],
      },
      deflect: {
        speaker: 'Pip',
        text: "Suspicious? Me? I'm a model citizen. Now mind your business before I — I mean, before I finish my drink.",
        choices: [{ text: "Sure.", action: 'close' }],
      },
    },
  },

  tavern_thief_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Pip',
        text: "Oi — not what it looks like! I was just... checking if the big lug still had his coins. You know, for safekeeping! Look, don't turn me in — I'll make it worth your while.",
        choices: [
          { text: "Come with me instead. Better than a cell.", action: 'goto', target: 'recruit' },
          { text: "I'm calling the guard.", action: 'close' },
        ],
      },
      recruit: {
        speaker: 'Pip',
        text: "Travel with you? You just flattened Rogan and you're offering me a job? ...Yeah, alright. I can pick locks, scout ahead, and I've got light fingers when we need them. Deal?",
        choices: [
          { text: "Deal. Welcome aboard, Pip.", action: 'join_party' },
          { text: "On second thought, get lost.", action: 'close' },
        ],
      },
    },
  },

  tavern_thief_joined: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Pip',
        text: "Eyes open, boss. I've already checked that last room. You're welcome.",
        choices: [{ text: "Good work.", action: 'close' }],
      },
    },
  },

  // Nara at the inn before any brawl — resting, not yet recruitable
  party_healer_inn: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Nara',
        text: "Just a wandering healer resting her feet. This inn gets more interesting every visit. The regulars keep me employed.",
        choices: [
          { text: "Sounds like steady work.", action: 'close' },
          { text: "What kind of interesting?", action: 'goto', target: 'curious' },
        ],
      },
      curious: {
        speaker: 'Nara',
        text: "Bar fights, mostly. That man Rogan over there has kept me busy for three nights running. Something tells me tonight won't be different.",
        choices: [{ text: "Good luck.", action: 'close' }],
      },
    },
  },

  // Nara after a brawl win or draw — she saw the fight, now recruitable
  party_healer_meet: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Nara',
        text: "You're tougher than you look. I've been watching those fights all week — I've got good instincts about who's worth following into trouble. Where are you headed?",
        choices: [
          { text: "Somewhere dangerous, probably.", action: 'goto', target: 'offer' },
          { text: "Thanks for the thought.", action: 'close' },
        ],
      },
      offer: {
        speaker: 'Nara',
        text: "Dangerous is exactly my speed. I can keep you alive while you figure out the plan. Deal?",
        choices: [
          { text: "Deal. Welcome, Nara.", action: 'join_party' },
          { text: "I work alone.", action: 'close' },
        ],
      },
    },
  },

  party_healer_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Nara',
        text: "Easy now, don't sit up too fast. You took quite a beating. I patched the worst of it. The thief took some coin while the crowd was distracted — sorry about that.",
        choices: [
          { text: "Thank you. Who are you?", action: 'goto', target: 'introduction' },
          { text: "I'm fine. Thanks.", action: 'close' },
        ],
      },
      introduction: {
        speaker: 'Nara',
        text: "Nara. Wandering healer. I've been looking for purpose beyond just stitching up bar fights, to be honest. You seem like the type who finds trouble. Maybe I can keep you alive through it?",
        choices: [
          { text: "I'd be glad to have a healer with me.", action: 'join_party' },
          { text: "I appreciate the patch-up. Safe travels.", action: 'close' },
        ],
      },
    },
  },

  party_healer_joined: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Nara',
        text: "You're looking better than last time. Try not to get floored again — potions aren't free.",
        choices: [{ text: "I'll try.", action: 'close' }],
      },
    },
  },

  // ===== WILDERNESS / FARM =====

  farmer_hess_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Hess Kettridge',
        text: "Thank the gods, someone's here. My son Torin... he went into that blasted swamp two days ago. And those crawler things are getting closer to my fields every night.",
        choices: [
          { text: "I'll find your son.", action: 'quest_offer', questId: 'sq_farm_01_son' },
          { text: "I'll deal with the Mire Crawlers.", action: 'quest_offer', questId: 'sq_farm_02_swamp' },
          { text: "Stay safe.", action: 'close' },
        ],
      },
    },
  },

  ranger_sela_default: {
    root: 'greeting',
    nodes: {
      greeting: {
        speaker: 'Sela Windmark',
        text: "Quiet here — too quiet. Bandits have set up a patrol route nearby. They'll raid the camp if we don't move on them.",
        choices: [
          { text: "I'll deal with the bandits.", action: 'quest_offer', questId: 'sq_river_01_bandits' },
          { text: "Stay alert.", action: 'close' },
        ],
      },
    },
  },
};
