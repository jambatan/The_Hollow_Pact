import http from 'http';
import { readFile, writeFile, readdir } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GameRoom } from './GameRoom.js';
import { CharacterStore } from './CharacterStore.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_DIR = resolve(__dirname, '../client');
const DATA_DIR   = resolve(__dirname, '../client/data');
const ZONES_DIR  = resolve(__dirname, '../client/data/zones');
const DEV_DIR    = resolve(__dirname, '../dev');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Dev API helpers ────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((res, rej) => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => { try { res(JSON.parse(b)); } catch(e) { rej(e); } });
    req.on('error', rej);
  });
}

// Load a plain-data ES module file by stripping 'export' keywords, then eval
function evalDataFile(content) {
  const cleaned = content.replace(/^export\s+(const|let|var)\s+/gm, 'const ');
  return new Function(cleaned + '\nreturn ' + (cleaned.match(/^const\s+(\w+)/m)?.[1] ?? 'undefined') + ';')();
}

function genTileMapJs(map, tileDefs = []) {
  // Build NAMES from tileDefs if provided, fall back to id_N
  const NAMES = {};
  for (const t of tileDefs) NAMES[t.id] = t.name;
  const entries = Object.entries(map)
    .sort(([a],[b]) => +a - +b)
    .map(([id, idx]) => {
      const col = idx % 57, row = Math.floor(idx / 57);
      return `  ${id}: ${idx},  // ${NAMES[id]||'id_'+id} — row ${row}, col ${col}`;
    });
  return `// Maps game TILE IDs to Kenney roguelikeSheet_transparent.png tile indices
// Sheet: 57 cols × 31 rows, 16×16 tiles, 1px margin  |  index = row * 57 + col
// Auto-saved by RPG dev tools
export const KENNEY_SHEET_COLS = 57;

export const KENNEY_TILE_MAP = {
${entries.join('\n')}
};
`;
}

// Load a zone ES module file by stripping 'export default', then eval
function evalZoneFile(content) {
  const stripped = content.replace(/export\s+default\s+/, '').trimEnd().replace(/;$/, '');
  return new Function('return (' + stripped + ')')();
}

function genZoneJs(zone) {
  const W = zone.width;
  let out = `// Auto-saved by RPG dev tools — world editor\nexport default {\n`;
  out += `  id: ${JSON.stringify(zone.id)},\n`;
  out += `  name: ${JSON.stringify(zone.name)},\n`;
  out += `  width: ${zone.width}, height: ${zone.height}, tileSize: ${zone.tileSize || 16},\n`;
  if (zone.ambientLight !== undefined) out += `  ambientLight: ${zone.ambientLight},\n`;
  if (zone.music) out += `  music: ${JSON.stringify(zone.music)},\n`;
  if (zone.spawnPoint) out += `  spawnPoint: ${JSON.stringify(zone.spawnPoint)},\n`;
  out += `  layers: [\n`;
  for (const layer of zone.layers) {
    const data = Array.isArray(layer.data) ? layer.data : Array.from(layer.data);
    out += `    { name: ${JSON.stringify(layer.name)}, data: [\n`;
    for (let y = 0; y < zone.height; y++) {
      out += `      ${data.slice(y * W, (y + 1) * W).join(',')},\n`;
    }
    out += `    ] },\n`;
  }
  out += `  ],\n`;
  for (const key of ['transitions','spawns','puzzles','npcs','labels']) {
    if (zone[key] !== undefined) {
      out += `  ${key}: ${JSON.stringify(zone[key], null, 2).replace(/\n/g, '\n  ')},\n`;
    }
  }
  out += `};\n`;
  return out;
}

function genDataJs(exportName, db) {
  return `// Auto-saved by RPG dev tools\nexport const ${exportName} = ${JSON.stringify(db, null, 2)};\n`;
}

// Shops need special handling: qty can be Infinity (not valid JSON)
// The client sends null to mean Infinity (or a sentinel '__INF__')
function genShopJs(db) {
  let out = '// Auto-saved by RPG dev tools\nexport const SHOP_DB = {\n';
  for (const [shopId, items] of Object.entries(db)) {
    out += `  ${shopId}: [\n`;
    for (const item of items) {
      const qty   = (item.qty === null || item.qty === '__INF__') ? 'Infinity' : item.qty;
      const price = item.price == null ? 'null' : item.price;
      out += `    { itemId: '${item.itemId}', qty: ${qty}, price: ${price} },\n`;
    }
    out += `  ],\n`;
  }
  out += `};\n`;
  return out;
}

// NPCs: evalDataFile evals Infinity fine; save uses JSON (no Infinity in npcs)
function genNpcJs(db) {
  return `// Auto-saved by RPG dev tools\nexport const NPC_DB = ${JSON.stringify(db, null, 2)};\n`;
}

function genLootTableJs(db) {
  return `// Shared loot tables — assign to enemies via lootTableId.\n// Individual enemy dropTable entries stack on top of the shared table.\nexport const LOOT_TABLE_DB = ${JSON.stringify(db, null, 2)};\n`;
}

function genQuestJs(db) {
  return `// Auto-saved by RPG dev tools\nexport const QUEST_DB = ${JSON.stringify(db, null, 2)};\n`;
}

function genDialogueJs(db) {
  return `// Auto-saved by RPG dev tools\nexport const DIALOGUE_DB = ${JSON.stringify(db, null, 2)};\n`;
}

function genSmartTilesJs(groups) {
  return `// Auto-saved by RPG dev tools\n// Smart tile groups — sets of tile variants that auto-arrange based on neighbors.\nexport const SMART_TILE_GROUPS = ${JSON.stringify(groups, null, 2)};\n`;
}

function genTileDefsJs(defs) {
  return `// Auto-saved by RPG dev tools\n// Single source of truth for tile type definitions.\n// id: unique tile ID (0 = empty/none)\n// name: UPPER_SNAKE_CASE constant name used in code as TILE.NAME\n// cat: 'terrain' | 'wall' | 'prop' | 'door' | 'special' | 'roof'\n// blocking: true = impassable on the objects layer\nexport const TILE_DEFS = ${JSON.stringify(defs, null, 2)};\n`;
}

async function handleDevApi(req, res) {
  const urlPath = req.url.split('?')[0];
  const api = urlPath.slice('/dev/api/'.length);
  res.setHeader('Content-Type', 'application/json');

  const send = (data, code=200) => { res.writeHead(code); res.end(JSON.stringify(data)); };

  try {
    // ── tilemap ──
    if (api === 'tilemap' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'kenneyTileMap.js'), 'utf8');
      const entries = [...src.matchAll(/^\s+(\d+):\s*(\d+)/gm)];
      const map = {};
      for (const [,id,idx] of entries) map[+id] = +idx;
      const c = src.match(/KENNEY_SHEET_COLS\s*=\s*(\d+)/);
      send({ map, cols: c ? +c[1] : 57 });

    } else if (api === 'tilemap' && req.method === 'POST') {
      const { map } = await readBody(req);
      let tileDefs = [];
      try { const src = await readFile(join(DATA_DIR, 'tileDefs.js'), 'utf8'); tileDefs = evalDataFile(src); } catch {}
      await writeFile(join(DATA_DIR, 'kenneyTileMap.js'), genTileMapJs(map, tileDefs), 'utf8');
      send({ ok: true });

    // ── items ──
    } else if (api === 'items' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'items.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'items' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'items.js'), genDataJs('ITEM_DB', db), 'utf8');
      send({ ok: true });

    // ── enemies ──
    } else if (api === 'enemies' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'enemies.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'enemies' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'enemies.js'), genDataJs('ENEMY_DB', db), 'utf8');
      send({ ok: true });

    // ── npcs ──
    } else if (api === 'npcs' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'npcs.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'npcs' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'npcs.js'), genNpcJs(db), 'utf8');
      send({ ok: true });

    // ── shops ──
    } else if (api === 'shops' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'shops.js'), 'utf8');
      // Replace JS Infinity with a sentinel string before eval so it survives JSON
      const sanitized = src.replace(/\bInfinity\b/g, '"__INF__"');
      send(evalDataFile(sanitized));

    } else if (api === 'shops' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'shops.js'), genShopJs(db), 'utf8');
      send({ ok: true });

    // ── loot tables ──
    } else if (api === 'loottables' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'lootTables.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'loottables' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'lootTables.js'), genLootTableJs(db), 'utf8');
      send({ ok: true });

    // ── quests ──
    } else if (api === 'quests' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'quests.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'quests' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'quests.js'), genQuestJs(db), 'utf8');
      send({ ok: true });

    // ── dialogue ──
    } else if (api === 'dialogue' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'dialogue/index.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'dialogue' && req.method === 'POST') {
      const { db } = await readBody(req);
      await writeFile(join(DATA_DIR, 'dialogue/index.js'), genDialogueJs(db), 'utf8');
      send({ ok: true });

    // ── tile defs ──
    } else if (api === 'tiledefs' && req.method === 'GET') {
      const src = await readFile(join(DATA_DIR, 'tileDefs.js'), 'utf8');
      send(evalDataFile(src));

    } else if (api === 'tiledefs' && req.method === 'POST') {
      const { defs } = await readBody(req);
      await writeFile(join(DATA_DIR, 'tileDefs.js'), genTileDefsJs(defs), 'utf8');
      send({ ok: true });

    // ── smart tiles ──
    } else if (api === 'smarttiles' && req.method === 'GET') {
      try {
        const src = await readFile(join(DATA_DIR, 'smartTiles.js'), 'utf8');
        send(evalDataFile(src));
      } catch { send([]); }

    } else if (api === 'smarttiles' && req.method === 'POST') {
      const { groups } = await readBody(req);
      await writeFile(join(DATA_DIR, 'smartTiles.js'), genSmartTilesJs(groups), 'utf8');
      send({ ok: true });

    // ── remap tile IDs across all zone files ──
    } else if (api === 'remap-tiles' && req.method === 'POST') {
      const { map: rawMap } = await readBody(req);
      // Convert string keys to numbers
      const map = {};
      for (const [k, v] of Object.entries(rawMap ?? {})) map[Number(k)] = Number(v);
      const files = (await readdir(ZONES_DIR)).filter(f => f.endsWith('.js'));
      let totalReplacements = 0;
      for (const file of files) {
        const src  = await readFile(join(ZONES_DIR, file), 'utf8');
        const zone = evalZoneFile(src);
        let replacements = 0;
        for (const layer of (zone.layers ?? [])) {
          if (!Array.isArray(layer.data)) continue;
          for (let i = 0; i < layer.data.length; i++) {
            const id = layer.data[i];
            if (id && map[id] !== undefined) { layer.data[i] = map[id]; replacements++; }
          }
        }
        await writeFile(join(ZONES_DIR, file), genZoneJs(zone), 'utf8');
        totalReplacements += replacements;
      }
      send({ ok: true, zones: files.length, replacements: totalReplacements });

    // ── characters ──
    } else if (api === 'characters' && req.method === 'GET') {
      send(charStore.getList());

    } else if (api.startsWith('characters/') && req.method === 'DELETE') {
      const charName = decodeURIComponent(api.slice('characters/'.length));
      const ok = charStore.delete(charName);
      send(ok ? { ok: true } : { error: 'Character not found' }, ok ? 200 : 404);

    } else if (api.match(/^characters\/[^/]+$/) && req.method === 'GET') {
      const charName = decodeURIComponent(api.split('/')[1]);
      const detail = charStore.getDetail(charName);
      detail ? send(detail) : send({ error: 'Not found' }, 404);

    } else if (api.match(/^characters\/[^/]+\/save$/) && req.method === 'POST') {
      const charName = decodeURIComponent(api.split('/')[1]);
      const body = await readBody(req);
      charStore.save(charName, body);
      send({ ok: true });

    } else if (api.match(/^characters\/[^/]+\/pin$/) && req.method === 'POST') {
      const charName = decodeURIComponent(api.split('/')[1]);
      const { newPin } = await readBody(req);
      send(charStore.changePin(charName, newPin));

    } else if (api.match(/^characters\/[^/]+\/rename$/) && req.method === 'POST') {
      const charName = decodeURIComponent(api.split('/')[1]);
      const { newName } = await readBody(req);
      send(charStore.rename(charName, newName));

    } else if (api.match(/^characters\/[^/]+\/copy$/) && req.method === 'POST') {
      const charName = decodeURIComponent(api.split('/')[1]);
      const { newName, pin } = await readBody(req);
      send(charStore.copy(charName, newName, pin));

    // ── zones ──
    } else if (api === 'zones' && req.method === 'GET') {
      const files = await readdir(ZONES_DIR);
      send(files.filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)));

    } else if (api === 'zone-links' && req.method === 'GET') {
      const files = await readdir(ZONES_DIR);
      const links = {};
      for (const f of files.filter(f => f.endsWith('.js'))) {
        try {
          const src  = await readFile(join(ZONES_DIR, f), 'utf8');
          const zone = evalZoneFile(src);
          links[f.slice(0, -3)] = (zone.transitions ?? []).map(t => ({
            id:     t.id     ?? '',
            toZone: t.toZone ?? '',
            toX:    t.toX    ?? 0,
            toY:    t.toY    ?? 0,
            note:   t.note   ?? '',
          }));
        } catch {}
      }
      send(links);

    } else if (api.startsWith('zone/') && req.method === 'GET') {
      const zoneId = api.slice(5);
      if (!/^[\w-]+$/.test(zoneId)) { send({ error: 'Invalid zone ID' }, 400); return; }
      const src = await readFile(join(ZONES_DIR, zoneId + '.js'), 'utf8');
      const zone = evalZoneFile(src);
      send({ id: zone.id, name: zone.name, width: zone.width, height: zone.height, tileSize: zone.tileSize || 16,
        ambientLight: zone.ambientLight ?? 1, spawnPoint: zone.spawnPoint ?? null,
        layers: zone.layers.map(l => ({ name: l.name, data: Array.from(l.data) })),
        transitions: zone.transitions ?? [],
        npcs: zone.npcs ?? [],
        spawns: zone.spawns ?? [],
        puzzles: zone.puzzles ?? [] });

    } else if (api.startsWith('zone/') && req.method === 'POST') {
      const zoneId = api.slice(5);
      if (!/^[\w-]+$/.test(zoneId)) { send({ error: 'Invalid zone ID' }, 400); return; }
      const body = await readBody(req);
      const src = await readFile(join(ZONES_DIR, zoneId + '.js'), 'utf8');
      const zone = evalZoneFile(src);
      if (body.layers)      zone.layers      = body.layers;
      if (body.transitions) zone.transitions  = body.transitions;
      if (body.npcs)        zone.npcs         = body.npcs;
      if (body.spawns)      zone.spawns       = body.spawns;
      if (body.spawnPoint)  zone.spawnPoint   = body.spawnPoint;
      await writeFile(join(ZONES_DIR, zoneId + '.js'), genZoneJs(zone), 'utf8');
      send({ ok: true });

    // ── zone-new ──
    } else if (api === 'zone-new' && req.method === 'POST') {
      const { id, name, width, height, tileSize = 16 } = await readBody(req);
      if (!id || !/^[\w-]+$/.test(id)) { send({ error: 'Invalid zone ID' }, 400); return; }
      const path = join(ZONES_DIR, id + '.js');
      const { existsSync } = await import('fs');
      if (existsSync(path)) { send({ error: 'Zone already exists' }, 409); return; }
      const blank = new Array(width * height).fill(1);
      const zone = {
        id, name: name || id, width, height, tileSize,
        ambientLight: 1,
        spawnPoint: { x: Math.floor(width / 2) * tileSize, y: Math.floor(height / 2) * tileSize },
        layers: [
          { name: 'ground',  data: blank.slice() },
          { name: 'ground2', data: new Array(width * height).fill(0) },
          { name: 'objects', data: new Array(width * height).fill(0) },
        ],
        transitions: [], spawns: [], npcs: [],
      };
      await writeFile(path, genZoneJs(zone), 'utf8');
      send({ ok: true });

    // ── zone-copy ──
    } else if (api === 'zone-copy' && req.method === 'POST') {
      const { srcId, newId, newName, incLayers, incSpawns, incTransitions, incNpcs, incSpawnPoint } = await readBody(req);
      if (!newId || !/^[\w-]+$/.test(newId)) { send({ error: 'Invalid new zone ID' }, 400); return; }
      const srcPath = join(ZONES_DIR, srcId + '.js');
      const dstPath = join(ZONES_DIR, newId + '.js');
      const { existsSync } = await import('fs');
      if (!existsSync(srcPath)) { send({ error: 'Source zone not found' }, 404); return; }
      if (existsSync(dstPath))  { send({ error: 'Destination ID already exists' }, 409); return; }
      const src = await readFile(srcPath, 'utf8');
      const srcZone = evalZoneFile(src);
      const blank = new Array(srcZone.width * srcZone.height).fill(0);
      const zone = {
        id: newId, name: newName || newId,
        width: srcZone.width, height: srcZone.height, tileSize: srcZone.tileSize || 16,
        ambientLight: srcZone.ambientLight ?? 1,
        spawnPoint:   incSpawnPoint ? { ...srcZone.spawnPoint } : { x: Math.floor(srcZone.width/2) * (srcZone.tileSize||16), y: Math.floor(srcZone.height/2) * (srcZone.tileSize||16) },
        layers: (() => {
          // Ensure ground2 exists in source layers; insert after ground if missing
          const srcLayers = srcZone.layers;
          if (!srcLayers.find(l => l.name === 'ground2')) {
            const gi = srcLayers.findIndex(l => l.name === 'ground');
            srcLayers.splice(gi + 1, 0, { name: 'ground2', data: blank.slice() });
          }
          return incLayers
            ? srcLayers.map(l => ({ name: l.name, data: Array.from(l.data) }))
            : srcLayers.map(l => ({ name: l.name, data: l.name === 'ground' ? new Array(srcZone.width*srcZone.height).fill(1) : blank.slice() }));
        })(),
        transitions:  incTransitions ? JSON.parse(JSON.stringify(srcZone.transitions ?? [])) : [],
        spawns:       incSpawns      ? JSON.parse(JSON.stringify(srcZone.spawns      ?? [])) : [],
        npcs:         incNpcs        ? JSON.parse(JSON.stringify(srcZone.npcs        ?? [])) : [],
      };
      await writeFile(dstPath, genZoneJs(zone), 'utf8');
      send({ ok: true });

    // ── zone-rename (+ optional resize, updates toZone refs) ──
    } else if (api === 'zone-rename' && req.method === 'POST') {
      const { oldId, newId, newName, newWidth, newHeight } = await readBody(req);
      if (!newId || !/^[\w-]+$/.test(newId)) { send({ error: 'Invalid new zone ID' }, 400); return; }
      const oldPath = join(ZONES_DIR, oldId + '.js');
      const newPath = join(ZONES_DIR, newId + '.js');
      const { existsSync } = await import('fs');
      if (!existsSync(oldPath)) { send({ error: 'Zone not found' }, 404); return; }
      if (newId !== oldId && existsSync(newPath)) { send({ error: 'New ID already exists' }, 409); return; }

      const src = await readFile(oldPath, 'utf8');
      const zone = evalZoneFile(src);
      const doResize = newWidth && newHeight && (newWidth !== zone.width || newHeight !== zone.height);
      if (doResize) {
        const ow = zone.width, oh = zone.height, nw = +newWidth, nh = +newHeight;
        for (const layer of zone.layers) {
          const old = Array.from(layer.data);
          const fill = layer.name === 'ground' ? 1 : 0;
          const nd = new Array(nw * nh).fill(fill);
          const copyW = Math.min(ow, nw), copyH = Math.min(oh, nh);
          for (let row = 0; row < copyH; row++)
            for (let col = 0; col < copyW; col++)
              nd[row * nw + col] = old[row * ow + col];
          layer.data = nd;
        }
        zone.width = nw; zone.height = nh;
      }
      zone.id   = newId;
      zone.name = newName || zone.name;
      await writeFile(newPath, genZoneJs(zone), 'utf8');
      if (newId !== oldId) {
        const { unlink } = await import('fs/promises');
        await unlink(oldPath);
      }

      // Patch toZone refs in all other zone files
      if (newId !== oldId) {
        const files = await readdir(ZONES_DIR);
        for (const f of files.filter(f => f.endsWith('.js') && f !== newId + '.js')) {
          try {
            const fsrc  = await readFile(join(ZONES_DIR, f), 'utf8');
            if (!fsrc.includes(oldId)) continue;
            const fzone = evalZoneFile(fsrc);
            let changed = false;
            for (const t of fzone.transitions ?? []) {
              if (t.toZone === oldId) { t.toZone = newId; changed = true; }
            }
            if (changed) await writeFile(join(ZONES_DIR, f), genZoneJs(fzone), 'utf8');
          } catch {}
        }
      }
      send({ ok: true, newId });

    } else {
      send({ error: 'Not found' }, 404);
    }
  } catch(err) {
    console.error('Dev API error:', err.message);
    send({ error: err.message }, 500);
  }
}

// ── HTTP server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Dev tool — password-gated in production via DEV_PASSWORD env var
  const DEV_PASSWORD = process.env.DEV_PASSWORD;
  if (DEV_PASSWORD && (urlPath.startsWith('/dev/'))) {
    const auth = req.headers['authorization'] ?? '';
    const [, token] = auth.split(' ');
    const provided = token ? Buffer.from(token, 'base64').toString().split(':')[1] : '';
    if (provided !== DEV_PASSWORD) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Dev Tools"' });
      res.end('Unauthorized');
      return;
    }
  }

  // Dev API
  if (urlPath.startsWith('/dev/api/')) {
    await handleDevApi(req, res);
    return;
  }

  // File serving
  let filePath;
  if (urlPath === '/dev' || urlPath === '/dev/') {
    filePath = join(DEV_DIR, 'index.html');
  } else if (urlPath.startsWith('/dev/')) {
    filePath = resolve(DEV_DIR, urlPath.slice(5));
  } else if (urlPath.startsWith('/shared/') || urlPath.startsWith('/assets/')) {
    filePath = resolve(__dirname, '..', urlPath.slice(1));
  } else {
    filePath = join(CLIENT_DIR, urlPath);
  }

  try {
    const data = await readFile(filePath);
    const ext  = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ── WebSocket server ───────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const rooms = new Map();

// ── Character Store ─────────────────────────────────────────────────────────
const charStore = new CharacterStore();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const room = new GameRoom(roomId, charStore);
    rooms.set(roomId, room);
    room.on('empty', () => { rooms.delete(roomId); console.log(`Room ${roomId} destroyed`); });
  }
  return rooms.get(roomId);
}

wss.on('connection', (ws, req) => {
  const url    = new URL(req.url, `http://localhost`);
  const roomId = url.searchParams.get('room') ?? 'default';
  const room   = getOrCreateRoom(roomId);
  room.addPlayer(ws);
  console.log(`Player joined room "${roomId}" (${room.playerCount} total)`);
});

charStore.load().then(() => {
  server.listen(PORT, () => {
    console.log(`RPG server running → http://localhost:${PORT}`);
    console.log(`Dev tools         → http://localhost:${PORT}/dev`);
  });
});
