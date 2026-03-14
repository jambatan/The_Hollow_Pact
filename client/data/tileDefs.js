// Auto-saved by RPG dev tools
// Single source of truth for tile type definitions.
// id: unique tile ID (0 = empty/none)
// name: UPPER_SNAKE_CASE constant name used in code as TILE.NAME
// cat: 'terrain' | 'wall' | 'prop' | 'door' | 'special' | 'roof'
// blocking: true = impassable on the objects layer
export const TILE_DEFS = [
  {
    "id": 1,
    "name": "GRASS",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 2,
    "name": "DIRT",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 3,
    "name": "STONE_FLOOR",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 4,
    "name": "WOOD_FLOOR",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 5,
    "name": "WATER",
    "cat": "terrain",
    "blocking": true
  },
  {
    "id": 6,
    "name": "SAND",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 7,
    "name": "PURPLE_POOL",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 8,
    "name": "DUNGEON_FLOOR",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 9,
    "name": "PATH",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 10,
    "name": "WATER_DEEP",
    "cat": "terrain",
    "blocking": true
  },
  {
    "id": 11,
    "name": "LAVA_POOL",
    "cat": "terrain",
    "blocking": true
  },
  {
    "id": 12,
    "name": "GREEN_POOL",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 101,
    "name": "WALL_STONE",
    "cat": "wall",
    "blocking": true
  },
  {
    "id": 102,
    "name": "WALL_WOOD",
    "cat": "wall",
    "blocking": true
  },
  {
    "id": 103,
    "name": "PILLAR_CORAL",
    "cat": "wall",
    "blocking": true
  },
  {
    "id": 104,
    "name": "WALL_CORAL",
    "cat": "wall",
    "blocking": true
  },
  {
    "id": 151,
    "name": "DOOR_CLOSED",
    "cat": "door",
    "blocking": true
  },
  {
    "id": 152,
    "name": "DOOR_OPEN",
    "cat": "door",
    "blocking": false
  },
  {
    "id": 153,
    "name": "GATE_CLOSED",
    "cat": "door",
    "blocking": true
  },
  {
    "id": 154,
    "name": "GATE_OPEN",
    "cat": "door",
    "blocking": false
  },
  {
    "id": 201,
    "name": "ROOF_THATCH",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 202,
    "name": "ROOF_STONE",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 203,
    "name": "ROOF_CORAL",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 204,
    "name": "MARBLE_ROOF",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 301,
    "name": "STAIRS_DOWN",
    "cat": "special",
    "blocking": false
  },
  {
    "id": 302,
    "name": "STAIRS_UP",
    "cat": "special",
    "blocking": false
  },
  {
    "id": 303,
    "name": "PRESSURE_PLATE",
    "cat": "special",
    "blocking": false
  },
  {
    "id": 401,
    "name": "TREE",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 402,
    "name": "TREE_TOP",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 403,
    "name": "BUSH",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 404,
    "name": "FENCE",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 405,
    "name": "CHEST",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 406,
    "name": "SIGN",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 407,
    "name": "TORCH",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 408,
    "name": "CAMPFIRE",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 409,
    "name": "BARREL",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 410,
    "name": "TABLE",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 411,
    "name": "BED",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 412,
    "name": "TABLE_LONG",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 413,
    "name": "FENCE_LONG",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 1001,
    "name": "LAVA_POOL_NW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1002,
    "name": "LAVA_POOL_N",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1003,
    "name": "LAVA_POOL_NE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1004,
    "name": "LAVA_POOL_W",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1005,
    "name": "LAVA_POOL_C",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1006,
    "name": "LAVA_POOL_E",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1007,
    "name": "LAVA_POOL_SW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1008,
    "name": "LAVA_POOL_S",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1009,
    "name": "LAVA_POOL_SE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1010,
    "name": "GREEN_POOL_NW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1011,
    "name": "GREEN_POOL_N",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1012,
    "name": "GREEN_POOL_NE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1013,
    "name": "GREEN_POOL_W",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1014,
    "name": "GREEN_POOL_C",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1015,
    "name": "GREEN_POOL_E",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1016,
    "name": "GREEN_POOL_SW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1017,
    "name": "GREEN_POOL_S",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1018,
    "name": "GREEN_POOL_SE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1019,
    "name": "PURPLE_POOL_NW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1020,
    "name": "PURPLE_POOL_N",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1021,
    "name": "PURPLE_POOL_NE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1022,
    "name": "PURPLE_POOL_W",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1023,
    "name": "PURPLE_POOL_E",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1024,
    "name": "PURPLE_POOL_SW",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1025,
    "name": "PURPLE_POOL_S",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1026,
    "name": "PURPLE_POOL_SE",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1027,
    "name": "PATH_1",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1028,
    "name": "PATH_2",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1029,
    "name": "PATH_3",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1030,
    "name": "PATH_4",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1031,
    "name": "PATH_5",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1032,
    "name": "PATH_6",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1033,
    "name": "PATH_7",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1034,
    "name": "PATH_8",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1035,
    "name": "PATH_9",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1036,
    "name": "PATH_10",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1037,
    "name": "PATH_11",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1038,
    "name": "PATH_12",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1039,
    "name": "PATH_13",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1040,
    "name": "PATH_14",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1041,
    "name": "PATH_15",
    "cat": "terrain",
    "blocking": false
  },
  {
    "id": 1042,
    "name": "TABLE_LONG_M",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 1043,
    "name": "TABLE_LONG_T",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 1044,
    "name": "TABLE_LONG_B",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 1045,
    "name": "PILLAR_CORAL_T",
    "cat": "wall",
    "blocking": false
  },
  {
    "id": 1046,
    "name": "PILLAR_CORAL_M",
    "cat": "wall",
    "blocking": false
  },
  {
    "id": 1047,
    "name": "PILLAR_CORAL_B",
    "cat": "wall",
    "blocking": false
  },
  {
    "id": 1048,
    "name": "ROOF_CORAL_NW",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1049,
    "name": "ROOF_CORAL_N",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1050,
    "name": "ROOF_CORAL_NE",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1051,
    "name": "ROOF_CORAL_W",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1052,
    "name": "ROOF_CORAL_C",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1053,
    "name": "ROOF_CORAL_E",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1054,
    "name": "ROOF_CORAL_SW",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1055,
    "name": "ROOF_CORAL_S",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1056,
    "name": "ROOF_CORAL_SE",
    "cat": "roof",
    "blocking": false
  },
  {
    "id": 1057,
    "name": "WALL_CORAL_L",
    "cat": "wall",
    "blocking": false
  },
  {
    "id": 1058,
    "name": "WALL_CORAL_R",
    "cat": "wall",
    "blocking": false
  },
  {
    "id": 1059,
    "name": "TABLE_LONG_C",
    "cat": "prop",
    "blocking": false
  },
  {
    "id": 1060,
    "name": "FENCE_LONG_L",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 1061,
    "name": "FENCE_LONG_C",
    "cat": "prop",
    "blocking": true
  },
  {
    "id": 1062,
    "name": "FENCE_LONG_R",
    "cat": "prop",
    "blocking": true
  }
];
