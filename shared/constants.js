export const TILE_SIZE = 16;
export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const UPDATE_HZ = 60;
export const FIXED_DT = 1 / UPDATE_HZ;
export const NETWORK_HZ = 20;
export const MAX_PLAYERS = 4;

export const STATS = ['STR', 'DEX', 'INT', 'CON', 'WIS', 'CHA'];

export const SLOT_NAMES = [
  'head', 'neck', 'chest', 'waist', 'legs', 'feet',
  'mainhand', 'offhand',
  'earring', 'earring2', 'wrists', 'wrists2', 'ring1', 'ring2',
];

export const EVENTS = {
  ENTITY_DIED:      'entity:died',
  ENTITY_SPAWNED:   'entity:spawned',
  ITEM_ACQUIRED:    'item:acquired',
  ITEM_REMOVED:     'item:removed',
  INVENTORY_CHANGED:'inventory:changed',
  ZONE_CHANGED:     'zone:changed',
  ZONE_TRANSITION:  'zone:transition',
  QUEST_UPDATED:    'quest:updated',
  QUEST_COMPLETED:  'quest:completed',
  DIALOGUE_START:   'dialogue:start',
  DIALOGUE_END:     'dialogue:end',
  SHOP_OPEN:        'shop:open',
  SHOP_CLOSE:       'shop:close',
  PUZZLE_SOLVED:    'puzzle:solved',
  PLAYER_LEVEL_UP:  'player:levelup',
  PLAYER_DAMAGED:   'player:damaged',
  COMBAT_HIT:       'combat:hit',
  NOTIFICATION:     'notification:show',
  NETWORK_SNAPSHOT: 'network:snapshot',
  UI_TOGGLE:        'ui:toggle',
  BATTLE_START:     'battle:start',
  BATTLE_END:       'battle:end',
  ESCORT_RESET:     'escort:reset',
  ESCORT_WARNING:   'escort:warning',
  PARTY_JOINED:     'party:joined',
  PARTY_MEMBER_KO:  'party:member_ko',
  NPC_TREE_SET:     'npc:tree_set',  // change an NPC's dialogue tree by id
};

export const MSG_TYPE = {
  JOIN:         'join',
  LEAVE:        'leave',
  SNAPSHOT:     'snapshot',
  ACTION:       'action',
  CHAT:         'chat',
  ROOM_STATE:   'room_state',
  ERROR:        'error',
  PARTY_INVITE: 'party_invite',  // relay invite to target player
  PARTY_ACCEPT: 'party_accept',  // accept invite, server links party
  PARTY_LEAVE:  'party_leave',   // leave party
  PARTY_UPDATE: 'party_update',  // broadcast party state to members
  PARTY_ZONE:   'party_zone',    // broadcast zone change to party members
  ENTITY_SYNC:  'entity_sync',   // relay enemy kills to same-zone players
  CHAR_LIST:    'char_list',     // client→server: request character list
  CHAR_LOAD:    'char_load',     // client→server: { name, pin }
  CHAR_CREATE:  'char_create',   // client→server: { name, pin }
  CHAR_DATA:    'char_data',     // server→client: { success, data?, error?, list? }
  CHAR_SAVE:    'char_save',     // client→server: full char snapshot
};
