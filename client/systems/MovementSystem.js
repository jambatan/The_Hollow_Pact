import { TILE_SIZE } from '../../shared/constants.js';

const SPEED_FACTOR = 60; // pixels per second at SPD=60

export class MovementSystem {
  constructor(input) {
    this.input = input;
  }

  update(dt, zone, players) {
    // Drive local player from input
    for (const player of players) {
      if (!player.isLocal) continue;
      const spd = player.stats.derived.SPD;
      const ax = this.input.axisX();
      const ay = this.input.axisY();
      // Normalize diagonal
      const len = Math.sqrt(ax * ax + ay * ay) || 1;
      player.vx = ax === 0 && ay === 0 ? 0 : (ax / len) * spd;
      player.vy = ax === 0 && ay === 0 ? 0 : (ay / len) * spd;
    }

    // Move + collide all entities with velocity
    for (const entity of zone.entities) {
      if (!entity.active) continue;
      if (entity.vx === 0 && entity.vy === 0) continue;

      const ts = zone.tileMap.tileSize;

      // Move X then Y (separated axis)
      this._moveAxis(entity, entity.vx * dt, 0, zone.tileMap);
      this._moveAxis(entity, 0, entity.vy * dt, zone.tileMap);
    }
  }

  _moveAxis(entity, dx, dy, tileMap) {
    const nx = entity.x + dx;
    const ny = entity.y + dy;
    const ts = tileMap.tileSize;

    // Shrink hitbox slightly for smoother corner movement
    const margin = 1;
    const ex = nx + margin, ey = ny + margin;
    const ew = entity.w - margin * 2, eh = entity.h - margin * 2;

    // Check four corners of hitbox
    const blocked =
      !tileMap.isWalkable(Math.floor(ex / ts),       Math.floor(ey / ts))       ||
      !tileMap.isWalkable(Math.floor((ex+ew) / ts),  Math.floor(ey / ts))       ||
      !tileMap.isWalkable(Math.floor(ex / ts),       Math.floor((ey+eh) / ts))  ||
      !tileMap.isWalkable(Math.floor((ex+ew) / ts),  Math.floor((ey+eh) / ts));

    if (!blocked) {
      entity.x = nx;
      entity.y = ny;
    } else {
      if (dx !== 0) entity.vx = 0;
      if (dy !== 0) entity.vy = 0;
    }
  }
}
