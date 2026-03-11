import { TileMap } from './TileMap.js';

export class Zone {
  constructor(def) {
    this.id          = def.id;
    this.name        = def.name;
    this.ambientLight = def.ambientLight ?? 1.0;
    this.music       = def.music ?? null;
    this.spawnPoint  = def.spawnPoint ?? { x: 64, y: 64 };

    // Build TileMap
    this.tileMap = new TileMap(def.width, def.height, def.tileSize ?? 16);
    for (const layer of (def.layers ?? [])) {
      this.tileMap.addLayer(layer.name, layer.data);
    }

    this.entities    = [];
    this.transitions = def.transitions ?? [];
    this.spawnDefs   = def.spawns ?? [];
    this.puzzles     = (def.puzzles ?? []).map(p => ({ ...p, solved: false }));
    this.npcDefs     = def.npcs ?? [];
    this.labels      = def.labels ?? [];
  }

  addEntity(entity) {
    this.entities.push(entity);
  }

  removeEntity(entity) {
    entity.active = false;
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
  }

  getEntitiesWithTag(tag) {
    return this.entities.filter(e => e.active && e.tags.has(tag));
  }

  // Check if world-pixel point is walkable
  isWalkableAt(wx, wy) {
    const tx = Math.floor(wx / this.tileMap.tileSize);
    const ty = Math.floor(wy / this.tileMap.tileSize);
    return this.tileMap.isWalkable(tx, ty);
  }
}
