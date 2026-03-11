// Maps game TILE IDs to Kenney roguelikeSheet_transparent.png tile indices
// Sheet: 57 cols × 31 rows, 16×16 tiles, 1px margin  |  index = row * 57 + col
// Auto-saved by RPG dev tools
export const KENNEY_SHEET_COLS = 57;

export const KENNEY_TILE_MAP = {
  1: 915,  // GRASS — row 16, col 3
  2: 578,  // DIRT — row 10, col 8
  3: 9,  // STONE_FLOOR — row 0, col 9
  4: 122,  // WOOD_FLOOR — row 2, col 8
  5: 60,  // WATER — row 1, col 3
  6: 1262,  // SAND — row 22, col 8
  7: 1257,  // SWAMP — row 22, col 3
  8: 177,  // DUNGEON_FLOOR — row 3, col 6
  9: 578,  // PATH — row 10, col 8
  10: 983,  // WALL_STONE — row 17, col 14
  11: 946,  // WALL_WOOD — row 16, col 34
  12: 640,  // TREE — row 11, col 13
  13: 583,  // TREE_TOP — row 10, col 13
  14: 526,  // BUSH — row 9, col 13
  15: 494,  // FENCE — row 8, col 38
  16: 89,  // DOOR_CLOSED — row 1, col 32
  17: 151,  // DOOR_OPEN — row 2, col 37
  18: 550,  // CHEST — row 9, col 37
  19: 360,  // SIGN — row 6, col 18
  20: 416,  // TORCH — row 7, col 17
  21: 1042,  // STAIRS_DOWN — row 18, col 16
  22: 1039,  // STAIRS_UP — row 18, col 13
  23: 961,  // PRESSURE_PLATE — row 16, col 49
  24: 1358,  // GATE_CLOSED — row 23, col 47
  25: 1356,  // GATE_OPEN — row 23, col 45
  26: 231,  // WATER_DEEP — row 4, col 3
  27: 470,  // CAMPFIRE — row 8, col 14
  28: 23,  // BARREL — row 0, col 23
  29: 364,  // TABLE — row 6, col 22
  30: 72,  // BED — row 1, col 15
  40: 1392,  // ROOF_THATCH — row 24, col 24
  41: 925,  // ROOF_STONE — row 16, col 13
};
