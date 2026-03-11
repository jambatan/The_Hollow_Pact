import { CANVAS_W, CANVAS_H, STATS } from '../../shared/constants.js';
import { KENNEY_TILE_MAP, KENNEY_SHEET_COLS } from '../data/kenneyTileMap.js';

export class DevConsole {
  constructor(events) {
    this.events  = events;
    this.visible = false;
    this._input  = '';
    this._log    = ['Dev Console ready. Type "help" for commands.'];
    this._game   = null; // set by Game.js after init

    // Capture keyboard input when visible
    window.addEventListener('keydown', e => {
      if (this._tilesheetMode) {
        e.stopPropagation();
        if (e.key === 'ArrowRight') this._tsCol = Math.min(KENNEY_SHEET_COLS - 1, this._tsCol + 4);
        if (e.key === 'ArrowLeft')  this._tsCol = Math.max(0, this._tsCol - 4);
        if (e.key === 'ArrowDown')  this._tsRow = Math.min(30, this._tsRow + 2);
        if (e.key === 'ArrowUp')    this._tsRow = Math.max(0, this._tsRow - 2);
        return;
      }
      if (!this.visible) return;
      e.stopPropagation();
      if (e.key === 'Enter') { this._execute(); return; }
      if (e.key === 'Backspace') { this._input = this._input.slice(0, -1); return; }
      if (e.key.length === 1 && e.key !== '`') this._input += e.key;
    });
  }

  toggle() {
    if (this._tilesheetMode) { this._tilesheetMode = false; return; }
    this.visible = !this.visible;
  }

  setGame(game) { this._game = game; }

  // Tilesheet viewer state
  _tilesheetMode = false;
  _tsCol = 0;  // scroll offset (tiles)
  _tsRow = 0;

  _execute() {
    const cmd = this._input.trim();
    this._log.push(`> ${cmd}`);
    this._input = '';
    if (cmd) this._runCommand(cmd.split(/\s+/));
  }

  _out(msg) { this._log.push(msg); if (this._log.length > 30) this._log.shift(); }

  _runCommand([verb, ...args]) {
    const g = this._game;
    const player = g?.localPlayer;

    switch (verb) {
      case 'help':
        this._out('tp <zone> [x] [y]  |  give <itemId> [qty]  |  gold <n>');
        this._out('stat <name> <val>  |  spawn <enemyId> [x] [y]');
        this._out('quest accept|complete <id>  |  time <0-24>');
        this._out('inspect  |  zones  |  hp  |  chars  |  clear');
        break;

      case 'chars': {
        const list = g?._charList ?? [];
        if (!list.length) { this._out('No characters (connect to server first)'); break; }
        this._out('  Name            Lv  Zone          LastSeen');
        this._out('  ─────────────────────────────────────────────');
        for (const c of list.slice(0, 20)) {
          const mins = Math.floor((Date.now() - (c.lastSeen ?? 0)) / 60_000);
          const ago  = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
          this._out(`  ${(c.name ?? '?').padEnd(15)} ${String(c.level ?? 1).padStart(2)}  ${(c.lastZone ?? '?').padEnd(13)} ${ago} ago`);
        }
        break;
      }

      case 'tp': {
        const zoneId = args[0];
        const tx = args[1] ? parseFloat(args[1]) * 16 : null;
        const ty = args[2] ? parseFloat(args[2]) * 16 : null;
        if (!zoneId) { this._out('Usage: tp <zoneId> [tileX] [tileY]'); break; }
        g?.teleport(zoneId, tx, ty)
          .then(() => this._out(`Teleported to ${zoneId}`))
          .catch(e => this._out(`Error: ${e.message}`));
        break;
      }

      case 'give': {
        if (!player?.inventory) { this._out('No player'); break; }
        const id = args[0], qty = parseInt(args[1]) || 1;
        import('../inventory/ItemFactory.js').then(({ ItemFactory }) => {
          const item = ItemFactory.create(id, qty);
          if (!item) { this._out(`Unknown item: ${id}`); return; }
          const ok = player.inventory.add(item);
          this._out(ok ? `Added ${qty}x ${item.name}` : 'Inventory full');
        });
        break;
      }

      case 'gold':
        if (!player) { this._out('No player'); break; }
        player.gold = parseInt(args[0]) || 0;
        this._out(`Gold set to ${player.gold}`);
        break;

      case 'stat': {
        if (!player) { this._out('No player'); break; }
        const statKey = args[0]?.toUpperCase();
        const statVal = parseInt(args[1]);
        if (!statKey || isNaN(statVal)) { this._out(`Usage: stat <${STATS.join('|')}> <val>`); break; }
        if (!STATS.includes(statKey)) { this._out(`Unknown stat "${statKey}". Valid: ${STATS.join(', ')}`); break; }
        player.stats.base[statKey] = statVal;
        player.stats.recalc();
        this._out(`${statKey} = ${statVal}`);
        break;
      }

      case 'hp':
        if (!player) { this._out('No player'); break; }
        player.stats.current.HP = player.stats.derived.HP;
        player.stats.current.MP = player.stats.derived.MP;
        this._out('HP/MP fully restored');
        break;

      case 'spawn': {
        const enemyId = args[0];
        if (!enemyId) { this._out('Usage: spawn <enemyId> [tileX] [tileY]'); break; }
        const ex = args[1] ? parseFloat(args[1]) * 16 : (player?.cx ?? 64) + 32;
        const ey = args[2] ? parseFloat(args[2]) * 16 : (player?.cy ?? 64);
        g?.spawnEnemy(enemyId, ex, ey)
          .then(ok => this._out(ok ? `Spawned ${enemyId}` : `Unknown enemy: ${enemyId}`));
        break;
      }

      case 'quest': {
        const action = args[0], qid = args[1];
        if (!qid) { this._out('Usage: quest accept|complete <questId>'); break; }
        const qs = g?.systems?.quest;
        if (!qs) { this._out('QuestSystem not ready'); break; }
        if (action === 'accept') {
          qs.offer(qid, null, player, g.events);
          this._out(`Quest accepted: ${qid}`);
        } else if (action === 'complete') {
          qs.completed.add(qid);
          qs.active.delete(qid);
          this._out(`Quest completed: ${qid}`);
        }
        break;
      }

      case 'time': {
        const hour = parseFloat(args[0]);
        if (isNaN(hour)) { this._out('Usage: time <0-24>'); break; }
        if (g?.world) {
          g.world.gameTime = (hour / 24) * g.world.DAY_LENGTH;
          this._out(`Time set to ${hour}:00`);
        }
        break;
      }

      case 'inspect': {
        const zone = g?.world?.current;
        if (!zone) { this._out('No active zone'); break; }
        this._out(`Zone: ${zone.id} | Entities: ${zone.entities.length}`);
        for (const e of zone.entities.slice(0, 10)) {
          this._out(`  [${e.id}] ${e.name || e.constructor.name} (${Math.round(e.x)},${Math.round(e.y)}) ${[...e.tags].join(',')}`);
        }
        if (zone.entities.length > 10) this._out(`  ...and ${zone.entities.length - 10} more`);
        break;
      }

      case 'zones':
        this._out([...(g?.world?._defs?.keys() ?? [])].join(', ') || 'No zones registered');
        break;

      case 'tilesheet':
        this._tilesheetMode = !this._tilesheetMode;
        this._tsCol = 0; this._tsRow = 0;
        this._out(this._tilesheetMode ? 'Tilesheet viewer open. Arrow keys scroll, ` to close.' : 'Tilesheet closed.');
        break;

      case 'clear':
        this._log = [];
        break;

      default:
        this._out(`Unknown command: ${verb}. Type "help".`);
    }
  }

  renderTilesheet(ctx) {
    const img = this._game?.assets?.getImage('tiles');
    const ZOOM = 2, TS = 16, STRIDE = 17; // source stride incl. 1px margin
    const DST = TS * ZOOM;                 // dest tile size (32px)
    const COLS_VIS = Math.floor(CANVAS_W / (DST + 1));
    const ROWS_VIS = Math.floor((CANVAS_H - 30) / (DST + 1));

    // Build reverse map: kenneyIndex → game tileId label
    const reverseMap = {};
    for (const [id, idx] of Object.entries(KENNEY_TILE_MAP)) reverseMap[idx] = id;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`TILESHEET  col:${this._tsCol} row:${this._tsRow}  [←→↑↓ scroll]  [\` close]`, 4, 10);

    for (let ry = 0; ry < ROWS_VIS; ry++) {
      for (let rx = 0; rx < COLS_VIS; rx++) {
        const col = this._tsCol + rx;
        const row = this._tsRow + ry;
        if (col >= KENNEY_SHEET_COLS || row >= 31) continue;
        const idx = row * KENNEY_SHEET_COLS + col;
        const dx = rx * (DST + 1);
        const dy = 18 + ry * (DST + 1);
        // Draw tile from sheet
        if (img) {
          ctx.drawImage(img, col * STRIDE, row * STRIDE, TS, TS, dx, dy, DST, DST);
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(dx, dy, DST, DST);
        }
        // Grid line
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(dx, dy, DST, DST);
        // Highlight tiles that are mapped to a game ID
        if (reverseMap[idx] !== undefined) {
          ctx.strokeStyle = '#ffdd00';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(dx, dy, DST, DST);
          ctx.fillStyle = '#ffdd00';
          ctx.font = '5px monospace';
          ctx.fillText(reverseMap[idx], dx + 1, dy + DST - 1);
        }
        // Row/col label every 5 tiles
        if (col % 5 === 0 && ry === 0) {
          ctx.fillStyle = '#88ccff';
          ctx.font = '5px monospace';
          ctx.fillText(`c${col}`, dx + 1, dy - 2);
        }
        if (row % 5 === 0 && rx === 0) {
          ctx.fillStyle = '#88ccff';
          ctx.font = '5px monospace';
          ctx.fillText(`r${row}`, 0, dy + 10);
        }
      }
    }
    // Index formula reminder
    ctx.fillStyle = '#666';
    ctx.font = '6px monospace';
    ctx.fillText('index = row * 57 + col   |   yellow border = currently mapped tile', 4, CANVAS_H - 4);
  }

  render(ctx) {
    if (this._tilesheetMode) { this.renderTilesheet(ctx); return; }
    const bx = 0, by = CANVAS_H - 200, bw = CANVAS_W, bh = 200;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.font = '6px monospace';
    const lineH = 9;
    const visLines = Math.floor((bh - 22) / lineH);
    const start = Math.max(0, this._log.length - visLines);
    for (let i = 0; i < Math.min(visLines, this._log.length); i++) {
      ctx.fillStyle = '#0f0';
      ctx.fillText(this._log[start + i], bx + 6, by + 10 + i * lineH);
    }

    // Input line
    const inputY = by + bh - 10;
    ctx.fillStyle = '#0f0';
    ctx.fillText(`> ${this._input}${Math.floor(Date.now() / 500) % 2 ? '█' : ' '}`, bx + 6, inputY);

    // Label
    ctx.fillStyle = '#080';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('DEV CONSOLE  [` to close]', bx + CANVAS_W - 130, by + 8);
  }
}
