import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';
import { TILE_DRAW } from '../world/TileMap.js';
import { KENNEY_TILE_MAP } from '../data/kenneyTileMap.js';

export class Renderer {
  constructor(canvas, ctx, camera, assets) {
    this.canvas = canvas;
    this.ctx    = ctx;
    this.camera = camera;
    this.assets = assets;
    this._debugCollisions = false;
  }

  clear() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  renderZone(zone, alpha, localPlayer) {
    const ctx = this.ctx;
    const cam = this.camera;

    ctx.save();
    cam.applyTransform(ctx);

    this._renderLayer(ctx, zone.tileMap, 'ground', cam);
    this._renderLayer(ctx, zone.tileMap, 'objects', cam);

    // Ambient darkness applied to tiles; entities render on top so they stay visible
    if (zone.ambientLight < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - zone.ambientLight})`;
      ctx.fillRect(cam.x, cam.y, cam.viewW, cam.viewH);
    }

    this._renderEntities(ctx, zone.entities, cam, alpha);

    // Roof layer — fade out when player is under it so interiors are visible
    const underRoof = localPlayer && (() => {
      const ts = zone.tileMap.tileSize;
      const ptx = Math.floor(localPlayer.cx / ts);
      const pty = Math.floor(localPlayer.cy / ts);
      return zone.tileMap.getTile('roof', ptx, pty) !== 0;
    })();

    if (underRoof) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      this._renderLayer(ctx, zone.tileMap, 'roof', cam);
      ctx.restore();
    } else {
      this._renderLayer(ctx, zone.tileMap, 'roof', cam);
    }

    if (this._debugCollisions) this._renderCollisionDebug(ctx, zone.tileMap, cam);

    // Zone labels (world-space text, e.g. portal names on world map)
    if (zone.labels?.length) {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      for (const lbl of zone.labels) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(lbl.text, lbl.x + 1, lbl.y + 1);
        ctx.fillStyle = '#ffee88';
        ctx.fillText(lbl.text, lbl.x, lbl.y);
      }
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  _renderLayer(ctx, tileMap, layerName, cam) {
    const ts = tileMap.tileSize;

    // Viewport-culled tile range
    const startTX = Math.max(0, Math.floor(cam.x / ts));
    const startTY = Math.max(0, Math.floor(cam.y / ts));
    const endTX   = Math.min(tileMap.width,  Math.ceil((cam.x + cam.viewW) / ts) + 1);
    const endTY   = Math.min(tileMap.height, Math.ceil((cam.y + cam.viewH) / ts) + 1);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const id = tileMap.getTile(layerName, tx, ty);
        if (id === 0) continue;
        const px = tx * ts, py = ty * ts;

        // Try spritesheet first — use Kenney mapping if available, else raw id-1
        const tileIndex = KENNEY_TILE_MAP[id] ?? (id - 1);
        const drawn = this.assets.drawTile(ctx, 'tiles', tileIndex, px, py, ts, ts);
        if (!drawn) {
          const fn = TILE_DRAW[id];
          if (fn) fn(ctx, px, py, ts);
          else {
            ctx.fillStyle = '#f0f'; ctx.fillRect(px, py, ts, ts);
          }
        }
      }
    }
  }

  _renderEntities(ctx, entities, cam, alpha) {
    // Y-sort for painter's algorithm depth
    const visible = entities
      .filter(e => e.active && e.visible && cam.isVisible(e.x, e.y, e.w, e.h + 8))
      .sort((a, b) => a.cy - b.cy);

    for (const e of visible) {
      ctx.save();
      e.draw(ctx, cam, this.assets);

      // Name labels
      if (e.name && (e.tags.has('npc') || e.tags.has('enemy'))) {
        ctx.fillStyle = e.tags.has('enemy') ? '#ff8888' : '#ffeeaa';
        ctx.font = '5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(e.name, e.cx, e.y - 4);
        ctx.textAlign = 'left';
      }

      ctx.restore();
    }
  }

  _renderCollisionDebug(ctx, tileMap, cam) {
    const ts = tileMap.tileSize;
    const startTX = Math.max(0, Math.floor(cam.x / ts));
    const startTY = Math.max(0, Math.floor(cam.y / ts));
    const endTX   = Math.min(tileMap.width,  Math.ceil((cam.x + cam.viewW) / ts) + 1);
    const endTY   = Math.min(tileMap.height, Math.ceil((cam.y + cam.viewH) / ts) + 1);

    ctx.strokeStyle = 'rgba(255,0,0,0.4)';
    ctx.lineWidth = 0.5;
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        if (!tileMap.isWalkable(tx, ty)) {
          ctx.strokeRect(tx * ts, ty * ts, ts, ts);
        }
      }
    }
  }

  // Render loading screen
  renderLoading(progress) {
    const ctx = this.ctx;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.fillStyle = '#333';
    ctx.fillRect(CANVAS_W / 2 - 100, CANVAS_H / 2, 200, 12);
    ctx.fillStyle = '#5588ff';
    ctx.fillRect(CANVAS_W / 2 - 100, CANVAS_H / 2, 200 * progress, 12);
    ctx.textAlign = 'left';
  }
}
