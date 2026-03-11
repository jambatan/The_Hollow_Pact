import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

// Panel dimensions
const PW = 420, PH = 380;
const PX = (CANVAS_W - PW) / 2;
const PY = (CANVAS_H - PH) / 2;

export class CharacterSelectUI {
  constructor() {
    this._state  = 'list'; // 'list' | 'pin' | 'create'
    this._list   = [];     // [{name, level, lastZone, lastSeen}] — server-sorted by level desc
    this._filter = '';
    this._sel    = 0;      // index in filtered list
    this._selectedChar = null;

    // PIN entry
    this._pin = '';

    // Create fields
    this._createName  = '';
    this._createPin   = '';
    this._createPin2  = '';
    this._createField = 0; // 0=name, 1=pin, 2=confirm

    // Feedback
    this._error      = '';
    this._errorTimer = 0;
    this._info       = 'Connecting to server…';

    // Callbacks wired by Game.js
    this.onAuthenticate = null; // (name, pin) => void
    this.onCreate       = null; // (name, pin) => void

    window.addEventListener('keydown', e => this._onKey(e));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setList(list) {
    this._list = list; // already sorted by level desc from server
    this._info = list.length === 0 ? 'No characters yet — press N to create one.' : '';
    this._clampSel();
  }

  setError(msg) {
    this._error = msg;
    this._errorTimer = 3;
    // Clear PIN on auth failure
    if (this._state === 'pin') this._pin = '';
    if (this._state === 'create') { this._createPin = ''; this._createPin2 = ''; }
  }

  // ── Key handling ───────────────────────────────────────────────────────────

  _onKey(e) {
    if (this._state === 'list')   this._keyList(e);
    else if (this._state === 'pin')    this._keyPin(e);
    else if (this._state === 'create') this._keyCreate(e);
  }

  _keyList(e) {
    const filtered = this._filtered();
    if (e.key === 'ArrowUp')    { e.preventDefault(); this._sel = Math.max(0, this._sel - 1); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); this._sel = Math.min(filtered.length - 1, this._sel + 1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) { this._selectedChar = filtered[this._sel]; this._pin = ''; this._state = 'pin'; }
      return;
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      this._createName = ''; this._createPin = ''; this._createPin2 = ''; this._createField = 0;
      this._state = 'create';
      return;
    }
    if (e.key === 'Backspace') { this._filter = this._filter.slice(0, -1); this._clampSel(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      this._filter += e.key;
      this._sel = 0;
    }
  }

  _keyPin(e) {
    if (e.key === 'Escape') { e.preventDefault(); this._state = 'list'; this._error = ''; return; }
    if (e.key === 'Enter')  {
      e.preventDefault();
      if (this._pin.length > 0) this.onAuthenticate?.(this._selectedChar.name, this._pin);
      return;
    }
    if (e.key === 'Backspace') { this._pin = this._pin.slice(0, -1); return; }
    if (e.key.length === 1 && this._pin.length < 30) this._pin += e.key;
  }

  _keyCreate(e) {
    if (e.key === 'Escape') { e.preventDefault(); this._state = 'list'; this._error = ''; return; }
    if (e.key === 'Tab')    { e.preventDefault(); this._createField = (this._createField + 1) % 3; return; }
    if (e.key === 'Enter')  {
      e.preventDefault();
      if (this._createField < 2) { this._createField++; return; }
      this._submitCreate();
      return;
    }
    if (e.key === 'Backspace') {
      if (this._createField === 0) this._createName = this._createName.slice(0, -1);
      else if (this._createField === 1) this._createPin = this._createPin.slice(0, -1);
      else this._createPin2 = this._createPin2.slice(0, -1);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      if (this._createField === 0 && this._createName.length < 20) this._createName += e.key;
      else if (this._createField === 1 && this._createPin.length < 30) this._createPin += e.key;
      else if (this._createField === 2 && this._createPin2.length < 30) this._createPin2 += e.key;
    }
  }

  _submitCreate() {
    const name = this._createName.trim();
    const pin  = this._createPin;
    const pin2 = this._createPin2;
    if (name.length < 3) { this.setError('Name must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { this.setError('Name: letters, digits and _ only'); return; }
    if (pin.length < 4)  { this.setError('PIN must be at least 4 characters'); return; }
    if (pin !== pin2)    { this.setError('PINs do not match'); return; }
    this.onCreate?.(name, pin);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _filtered() {
    if (!this._filter) return this._list;
    const f = this._filter.toLowerCase();
    return this._list.filter(c => c.name.toLowerCase().includes(f));
  }

  _clampSel() {
    const max = Math.max(0, this._filtered().length - 1);
    this._sel = Math.min(this._sel, max);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (this._errorTimer > 0) { this._errorTimer -= dt; if (this._errorTimer <= 0) this._error = ''; }
  }

  render(ctx) {
    // Dark overlay
    ctx.fillStyle = 'rgba(5,8,20,0.97)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0b429';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('⚔  THE HOLLOW PACT', CANVAS_W / 2, PY - 18);

    // Panel background
    ctx.fillStyle = '#0d1525';
    ctx.fillRect(PX, PY, PW, PH);
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(PX, PY, PW, PH);

    if (this._state === 'list')   this._renderList(ctx);
    else if (this._state === 'pin')    this._renderPin(ctx);
    else if (this._state === 'create') this._renderCreate(ctx);

    // Error banner
    if (this._error) {
      ctx.fillStyle = 'rgba(180,30,30,0.92)';
      ctx.fillRect(PX + 4, PY + PH - 28, PW - 8, 22);
      ctx.fillStyle = '#ffaaaa';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this._error, CANVAS_W / 2, PY + PH - 13);
    }

    ctx.textAlign = 'left';
  }

  _renderList(ctx) {
    const filtered = this._filtered();
    const x = PX + 14, y0 = PY + 14;

    // Header
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Select Character', x, y0 + 10);

    // Filter display
    ctx.fillStyle = '#5588cc';
    ctx.font = '7px monospace';
    const filterLabel = this._filter ? `Filter: ${this._filter}▌` : (this._list.length > 0 ? 'Type to filter…' : '');
    ctx.fillText(filterLabel, x, y0 + 24);

    // Column headers
    const listY = y0 + 36;
    ctx.fillStyle = '#445566';
    ctx.font = '6px monospace';
    ctx.fillText('NAME', x, listY);
    ctx.fillText('LV', x + 170, listY);
    ctx.fillText('LAST ZONE', x + 200, listY);
    ctx.fillStyle = '#223344';
    ctx.fillRect(PX + 4, listY + 3, PW - 8, 0.5);

    if (filtered.length === 0) {
      ctx.fillStyle = '#667';
      ctx.font = '7px monospace';
      ctx.fillText(this._info || (this._filter ? 'No matches.' : 'No characters yet — press N to create one.'), x, listY + 20);
    }

    const ROW_H = 26, MAX_ROWS = Math.floor((PH - 100) / ROW_H);
    // Scroll window
    const scrollStart = Math.max(0, this._sel - Math.floor(MAX_ROWS / 2));
    const visible = filtered.slice(scrollStart, scrollStart + MAX_ROWS);

    visible.forEach((c, i) => {
      const idx = scrollStart + i;
      const ry  = listY + 8 + i * ROW_H;
      const sel = idx === this._sel;

      if (sel) {
        ctx.fillStyle = 'rgba(60,100,180,0.3)';
        ctx.fillRect(PX + 4, ry - 8, PW - 8, ROW_H);
        ctx.strokeStyle = '#4466cc'; ctx.lineWidth = 0.5;
        ctx.strokeRect(PX + 4, ry - 8, PW - 8, ROW_H);
      }

      // Arrow
      ctx.fillStyle = sel ? '#ffdd88' : '#333';
      ctx.font = '7px monospace';
      ctx.fillText(sel ? '▶' : ' ', x - 8, ry + 2);

      // Name
      ctx.fillStyle = sel ? '#ffffff' : '#aabbcc';
      ctx.font = (sel ? 'bold ' : '') + '8px monospace';
      ctx.fillText(c.name, x, ry + 2);

      // Level
      ctx.fillStyle = sel ? '#ffdd88' : '#7799aa';
      ctx.font = '7px monospace';
      ctx.fillText(String(c.level), x + 175, ry + 2);

      // Zone
      ctx.fillStyle = sel ? '#88ccff' : '#556677';
      ctx.fillText(c.lastZone ?? '?', x + 200, ry + 2);

      // Last seen
      if (c.lastSeen) {
        const mins = Math.floor((Date.now() - c.lastSeen) / 60_000);
        const ago = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
        ctx.fillStyle = '#334455';
        ctx.font = '5px monospace';
        ctx.fillText(ago, x + 300, ry + 2);
      }
    });

    // Hints
    ctx.fillStyle = '#445566';
    ctx.font = '6px monospace';
    ctx.fillText('[↑↓] navigate  [Enter] select  [N] new character', x, PY + PH - 36);
  }

  _renderPin(ctx) {
    const cx = CANVAS_W / 2, cy = PY + PH / 2 - 20;
    ctx.textAlign = 'center';

    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(this._selectedChar?.name ?? '', cx, cy - 40);

    ctx.fillStyle = '#667788';
    ctx.font = '7px monospace';
    ctx.fillText('Enter PIN to continue', cx, cy - 24);

    // PIN box
    const bw = 160, bh = 28;
    const bx = cx - bw / 2, by = cy - 14;
    ctx.fillStyle = '#111a2a';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#4466cc'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#aaddff';
    ctx.font = '11px monospace';
    ctx.fillText('*'.repeat(this._pin.length) + '▌', cx, by + 18);

    ctx.fillStyle = '#445566';
    ctx.font = '6px monospace';
    ctx.fillText('[Enter] confirm  [Esc] back', cx, cy + 28);
  }

  _renderCreate(ctx) {
    const cx = CANVAS_W / 2;
    const x  = PX + 14;
    ctx.textAlign = 'center';

    ctx.fillStyle = '#88ff88';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Create New Character', cx, PY + 22);

    const fields = [
      { label: 'Name',        value: this._createName,             mask: false },
      { label: 'PIN',         value: this._createPin,              mask: true  },
      { label: 'Confirm PIN', value: this._createPin2,             mask: true  },
    ];

    fields.forEach((f, i) => {
      const fy  = PY + 60 + i * 76;
      const sel = this._createField === i;

      ctx.textAlign = 'left';
      ctx.fillStyle = sel ? '#ccddff' : '#667788';
      ctx.font = '7px monospace';
      ctx.fillText(f.label, x, fy);

      const bw = PW - 28, bh = 26;
      ctx.fillStyle = sel ? '#111a2a' : '#0d1017';
      ctx.fillRect(x, fy + 5, bw, bh);
      ctx.strokeStyle = sel ? '#4466cc' : '#223344'; ctx.lineWidth = 1;
      ctx.strokeRect(x, fy + 5, bw, bh);

      const display = f.mask ? ('*'.repeat(f.value.length)) : f.value;
      ctx.fillStyle = sel ? '#aaddff' : '#667788';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(display + (sel ? '▌' : ''), x + 6, fy + 22);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#445566';
    ctx.font = '6px monospace';
    ctx.fillText('[Tab] next field  [Enter] confirm / next  [Esc] back', cx, PY + PH - 36);
  }
}
