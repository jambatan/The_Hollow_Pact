import { TILE_SIZE } from '../../shared/constants.js';

// Tile IDs (0 = empty/transparent)
export const TILE = {
  NONE: 0,
  // Ground
  GRASS:        1,
  DIRT:         2,
  STONE_FLOOR:  3,
  WOOD_FLOOR:   4,
  WATER:        5,
  SAND:         6,
  SWAMP:        7,
  DUNGEON_FLOOR:8,
  PATH:         9,
  // Objects / walls
  WALL_STONE:   10,
  WALL_WOOD:    11,
  TREE:         12,
  TREE_TOP:     13,
  BUSH:         14,
  FENCE:        15,
  DOOR_CLOSED:  16,
  DOOR_OPEN:    17,
  CHEST:        18,
  SIGN:         19,
  TORCH:        20,
  STAIRS_DOWN:  21,
  STAIRS_UP:    22,
  PRESSURE_PLATE:23,
  GATE_CLOSED:  24,
  GATE_OPEN:    25,
  WATER_DEEP:   26,
  CAMPFIRE:     27,
  BARREL:       28,
  TABLE:        29,
  BED:          30,
  // Roof
  ROOF_THATCH:  40,
  ROOF_STONE:   41,
};

// Which tiles block movement
const BLOCKING = new Set([
  TILE.WALL_STONE, TILE.WALL_WOOD, TILE.TREE, TILE.WATER, TILE.WATER_DEEP,
  TILE.FENCE, TILE.DOOR_CLOSED, TILE.GATE_CLOSED, TILE.CHEST,
]);

export class TileMap {
  constructor(width, height, tileSize = TILE_SIZE) {
    this.width    = width;
    this.height   = height;
    this.tileSize = tileSize;
    // Named layers stored as flat Uint16Arrays
    this.layers = {};
    // Override walk grid (set programmatically e.g. by puzzles)
    this._walkOverride = new Map(); // "tx,ty" -> bool
  }

  addLayer(name, data) {
    this.layers[name] = data instanceof Uint16Array
      ? data : new Uint16Array(data);
  }

  getTile(layer, tx, ty) {
    const d = this.layers[layer];
    if (!d || tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return 0;
    return d[ty * this.width + tx];
  }

  setTile(layer, tx, ty, id) {
    const d = this.layers[layer];
    if (!d || tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return;
    d[ty * this.width + tx] = id;
  }

  isWalkable(tx, ty) {
    const key = `${tx},${ty}`;
    if (this._walkOverride.has(key)) return this._walkOverride.get(key);
    // Check object layer blocking
    const obj = this.getTile('objects', tx, ty);
    if (BLOCKING.has(obj)) return false;
    // Out of bounds = not walkable
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
    return true;
  }

  setWalkable(tx, ty, val) {
    this._walkOverride.set(`${tx},${ty}`, val);
  }

  // World pixel dimensions
  pixelWidth()  { return this.width  * this.tileSize; }
  pixelHeight() { return this.height * this.tileSize; }

  // Tile coords from world pixel coords
  worldToTile(wx, wy) {
    return { tx: Math.floor(wx / this.tileSize), ty: Math.floor(wy / this.tileSize) };
  }
}

// Canvas fallback drawing for each tile type
export const TILE_DRAW = {
  [TILE.GRASS]:        (ctx, x, y, s) => { ctx.fillStyle='#4a7c3f'; ctx.fillRect(x,y,s,s); },
  [TILE.DIRT]:         (ctx, x, y, s) => { ctx.fillStyle='#8b6340'; ctx.fillRect(x,y,s,s); },
  [TILE.STONE_FLOOR]:  (ctx, x, y, s) => { ctx.fillStyle='#888'; ctx.fillRect(x,y,s,s); drawGrid(ctx,x,y,s,'#777'); },
  [TILE.WOOD_FLOOR]:   (ctx, x, y, s) => { ctx.fillStyle='#a0723a'; ctx.fillRect(x,y,s,s); drawGrid(ctx,x,y,s,'#8b6330'); },
  [TILE.WATER]:        (ctx, x, y, s) => { ctx.fillStyle='#3a7dc9'; ctx.fillRect(x,y,s,s); },
  [TILE.SAND]:         (ctx, x, y, s) => { ctx.fillStyle='#d4b483'; ctx.fillRect(x,y,s,s); },
  [TILE.SWAMP]:        (ctx, x, y, s) => { ctx.fillStyle='#4a5e30'; ctx.fillRect(x,y,s,s); },
  [TILE.DUNGEON_FLOOR]:(ctx, x, y, s) => { ctx.fillStyle='#555'; ctx.fillRect(x,y,s,s); drawGrid(ctx,x,y,s,'#444'); },
  [TILE.PATH]:         (ctx, x, y, s) => { ctx.fillStyle='#b09060'; ctx.fillRect(x,y,s,s); },
  [TILE.WALL_STONE]:   (ctx, x, y, s) => { ctx.fillStyle='#666'; ctx.fillRect(x,y,s,s); drawGrid(ctx,x,y,s,'#555'); ctx.fillStyle='#777'; ctx.fillRect(x+1,y+1,s-2,2); },
  [TILE.WALL_WOOD]:    (ctx, x, y, s) => { ctx.fillStyle='#6b4a1e'; ctx.fillRect(x,y,s,s); },
  [TILE.TREE]:         (ctx, x, y, s) => { ctx.fillStyle='#2d5a1b'; ctx.fillRect(x,y,s,s); ctx.fillStyle='#1a3a0f'; ctx.fillRect(x+3,y+3,s-6,s-6); },
  [TILE.TREE_TOP]:     (ctx, x, y, s) => { ctx.fillStyle='#2d5a1b'; ctx.fillRect(x,y,s,s); },
  [TILE.BUSH]:         (ctx, x, y, s) => { ctx.fillStyle='#3a6e25'; ctx.fillRect(x,y,s,s); ctx.fillStyle='#4a5'; ctx.fillRect(x+2,y+4,s-4,s-6); },
  [TILE.FENCE]:        (ctx, x, y, s) => { ctx.fillStyle='#a08040'; ctx.fillRect(x,y+4,s,2); ctx.fillRect(x+2,y,2,s); ctx.fillRect(x+s-4,y,2,s); },
  [TILE.DOOR_CLOSED]:  (ctx, x, y, s) => { ctx.fillStyle='#7a5020'; ctx.fillRect(x+2,y+1,s-4,s-2); ctx.fillStyle='#c8a060'; ctx.fillRect(x+s-5,y+s/2-1,2,2); },
  [TILE.DOOR_OPEN]:    (ctx, x, y, s) => { ctx.fillStyle='#7a5020'; ctx.fillRect(x+2,y+1,3,s-2); },
  [TILE.CHEST]:        (ctx, x, y, s) => { ctx.fillStyle='#c8a020'; ctx.fillRect(x+1,y+4,s-2,s-5); ctx.fillStyle='#8b6010'; ctx.fillRect(x+1,y+4,s-2,3); ctx.fillStyle='#f0d040'; ctx.fillRect(x+s/2-1,y+5,2,2); },
  [TILE.TORCH]:        (ctx, x, y, s) => { ctx.fillStyle='#604010'; ctx.fillRect(x+s/2-1,y+4,2,s-5); ctx.fillStyle='#ff8800'; ctx.fillRect(x+s/2-2,y+1,4,5); },
  [TILE.STAIRS_DOWN]:  (ctx, x, y, s) => { ctx.fillStyle='#555'; ctx.fillRect(x,y,s,s); for(let i=0;i<3;i++){ctx.fillStyle='#888';ctx.fillRect(x+i*4,y+i*4,s-i*8,s-i*8);} },
  [TILE.STAIRS_UP]:    (ctx, x, y, s) => { ctx.fillStyle='#555'; ctx.fillRect(x,y,s,s); for(let i=2;i>=0;i--){ctx.fillStyle='#888';ctx.fillRect(x+i*4,y+i*4,s-i*8,s-i*8);} },
  [TILE.PRESSURE_PLATE]:(ctx,x,y,s) => { ctx.fillStyle='#888'; ctx.fillRect(x,y,s,s); ctx.fillStyle='#aaa'; ctx.fillRect(x+2,y+2,s-4,s-4); },
  [TILE.GATE_CLOSED]:  (ctx, x, y, s) => { ctx.fillStyle='#888'; for(let i=0;i<3;i++) ctx.fillRect(x+i*5+1,y,2,s); ctx.fillRect(x,y+s/2-1,s,2); },
  [TILE.GATE_OPEN]:    (ctx, x, y, s) => { /* empty */ },
  [TILE.WATER_DEEP]:   (ctx, x, y, s) => { ctx.fillStyle='#1a5aaa'; ctx.fillRect(x,y,s,s); },
  [TILE.CAMPFIRE]:     (ctx, x, y, s) => { ctx.fillStyle='#604010'; ctx.fillRect(x+3,y+8,s-6,4); ctx.fillStyle='#ff6600'; ctx.fillRect(x+4,y+4,s-8,6); ctx.fillStyle='#ffcc00'; ctx.fillRect(x+5,y+5,s-10,4); },
  [TILE.BARREL]:       (ctx, x, y, s) => { ctx.fillStyle='#8b6040'; ctx.fillRect(x+2,y+2,s-4,s-4); ctx.fillStyle='#704a20'; ctx.fillRect(x+2,y+4,s-4,2); ctx.fillRect(x+2,y+s-6,s-4,2); },
  [TILE.TABLE]:        (ctx, x, y, s) => { ctx.fillStyle='#a0723a'; ctx.fillRect(x+1,y+4,s-2,s-6); ctx.fillStyle='#8b6030'; ctx.fillRect(x+2,y+4,s-4,2); },
  [TILE.BED]:          (ctx, x, y, s) => { ctx.fillStyle='#c8a0a0'; ctx.fillRect(x+1,y+2,s-2,s-3); ctx.fillStyle='#e0e0ff'; ctx.fillRect(x+1,y+2,s-2,6); },
  [TILE.ROOF_THATCH]:  (ctx, x, y, s) => { ctx.fillStyle='#c8a040'; ctx.fillRect(x,y,s,s); },
  [TILE.ROOF_STONE]:   (ctx, x, y, s) => { ctx.fillStyle='#7a7a8a'; ctx.fillRect(x,y,s,s); },
};

function drawGrid(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y+s/2); ctx.lineTo(x+s, y+s/2);
  ctx.moveTo(x+s/2, y); ctx.lineTo(x+s/2, y+s);
  ctx.stroke();
}
