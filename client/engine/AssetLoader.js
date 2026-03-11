export class AssetLoader {
  constructor() {
    this._images = new Map();   // name → HTMLImageElement
    this._tilesets = new Map(); // name → { img, tileW, tileH, cols }
    this._pending = 0;
    this._loaded = 0;
  }

  // Preload an image; call before game starts
  load(name, url) {
    this._pending++;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this._images.set(name, img);
        this._loaded++;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`AssetLoader: failed to load "${name}" from ${url}`);
        this._pending--;
        resolve(null); // soft fail
      };
      img.src = url;
    });
  }

  // Register a loaded image as a tileset for tile drawing
  // margin: gap in pixels between tiles (e.g. Kenney sheets use 1px margin)
  registerTileset(name, tileW, tileH, margin = 0) {
    const img = this._images.get(name);
    if (!img) return;
    const stride = tileW + margin;
    const cols = Math.floor((img.width + margin) / stride);
    this._tilesets.set(name, { img, tileW, tileH, cols, margin });
  }

  // Draw tile by index from a registered tileset
  // Returns true if drawn from image, false if tileset not available
  drawTile(ctx, sheetName, tileIndex, dx, dy, dw, dh) {
    const ts = this._tilesets.get(sheetName);
    if (!ts) return false;
    const strideX = ts.tileW + (ts.margin ?? 0);
    const strideY = ts.tileH + (ts.margin ?? 0);
    const col = tileIndex % ts.cols;
    const row = Math.floor(tileIndex / ts.cols);
    ctx.drawImage(ts.img, col * strideX, row * strideY, ts.tileW, ts.tileH, dx, dy, dw, dh);
    return true;
  }

  hasTileset(name) { return this._tilesets.has(name); }
  getImage(name) { return this._images.get(name) ?? null; }

  get progress() {
    return this._pending === 0 ? 1 : this._loaded / this._pending;
  }
}
