import { readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = resolve(__dirname, '../characters.json');
const SALT = 'rpg_salt_2026';
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export class CharacterStore {
  constructor() {
    this._data  = {}; // key: name.toLowerCase() → record
    this._dirty = false;
  }

  async load() {
    if (existsSync(STORE_PATH)) {
      try {
        const raw = await readFile(STORE_PATH, 'utf8');
        this._data = JSON.parse(raw);
        console.log(`CharacterStore: loaded ${Object.keys(this._data).length} characters`);
      } catch (e) {
        console.error('CharacterStore: failed to parse characters.json —', e.message);
      }
    }
    // Safety-net flush every 60 s (save() already flushes immediately)
    setInterval(() => this._flush(), 60_000);
  }

  /** Returns sanitized list sorted by level desc, then lastSeen desc */
  getList() {
    return Object.values(this._data)
      .map(c => ({
        name:      c.name,
        level:     c.level     ?? 1,
        lastZone:  c.lastZone  ?? 'ashenvale',
        lastSeen:  c.lastSeen  ?? 0,
        gold:      c.gold      ?? 0,
        createdAt: c.createdAt ?? 0,
      }))
      .sort((a, b) => (b.level - a.level) || (b.lastSeen - a.lastSeen));
  }

  /** Create a new character. Returns { success, data } or { success: false, error } */
  create(name, pin) {
    if (!NAME_RE.test(name)) {
      return { success: false, error: 'Name must be 3–20 chars: letters, digits, underscore' };
    }
    const key = name.toLowerCase();
    if (this._data[key]) return { success: false, error: 'Name already taken' };

    const record = {
      name,
      pin: this._hash(pin),
      level: 1, xp: 0, gold: 0,
      baseStats: { STR: 5, DEX: 5, INT: 3, CON: 5, WIS: 3, CHA: 3 },
      inventory: [
        { itemId: 'sword_iron',     qty: 1, durability: null },
        { itemId: 'boots_leather',  qty: 1, durability: null },
        { itemId: 'health_potion',  qty: 3, durability: null },
        { itemId: 'bread',          qty: 5, durability: null },
      ],
      equipment:  {},
      quests:     { active: {}, completed: [], trackedIds: [] },
      lastZone:   'ashenvale',
      lastX:      null,
      lastY:      null,
      partyNpcs:  [],
      createdAt:  Date.now(),
      lastSeen:   Date.now(),
    };
    this._data[key] = record;
    this._dirty = true;
    this._flush(); // immediate persist on create
    return { success: true, data: this._sanitize(record) };
  }

  /** Authenticate. Returns { success, data } or { success: false, error } */
  authenticate(name, pin) {
    const record = this._data[name.toLowerCase()];
    if (!record) return { success: false, error: 'Character not found' };
    if (record.pin !== this._hash(pin)) return { success: false, error: 'Wrong PIN' };
    record.lastSeen = Date.now();
    this._dirty = true;
    return { success: true, data: this._sanitize(record) };
  }

  /** Merge save payload into existing record */
  save(name, payload) {
    const record = this._data[name.toLowerCase()];
    if (!record) return;
    // Merge only known safe fields (never overwrite pin or name)
    const safe = ['level','xp','gold','baseStats','inventory','equipment','quests','lastZone','lastX','lastY','partyNpcs'];
    for (const k of safe) {
      if (payload[k] !== undefined) record[k] = payload[k];
    }
    record.lastSeen = Date.now();
    this._dirty = true;
    this._flush(); // write immediately — don't wait for interval
  }

  /** Get full character detail (without PIN) */
  getDetail(name) {
    const record = this._data[name.toLowerCase()];
    return record ? this._sanitize(record) : null;
  }

  /** Rename a character */
  rename(oldName, newName) {
    if (!NAME_RE.test(newName)) return { success: false, error: 'Invalid name format' };
    const oldKey = oldName.toLowerCase();
    const newKey = newName.toLowerCase();
    if (!this._data[oldKey]) return { success: false, error: 'Character not found' };
    if (this._data[newKey] && newKey !== oldKey) return { success: false, error: 'Name already taken' };
    const record = { ...this._data[oldKey], name: newName };
    this._data[newKey] = record;
    if (newKey !== oldKey) delete this._data[oldKey];
    this._dirty = true;
    this._flush();
    return { success: true, newName };
  }

  /** Copy a character to a new name with a new PIN */
  copy(srcName, newName, pin) {
    if (!NAME_RE.test(newName)) return { success: false, error: 'Invalid name format' };
    const srcKey = srcName.toLowerCase();
    const newKey = newName.toLowerCase();
    if (!this._data[srcKey]) return { success: false, error: 'Source not found' };
    if (this._data[newKey]) return { success: false, error: 'Name already taken' };
    const record = {
      ...JSON.parse(JSON.stringify(this._data[srcKey])),
      name:      newName,
      pin:       this._hash(pin),
      createdAt: Date.now(),
      lastSeen:  Date.now(),
    };
    this._data[newKey] = record;
    this._dirty = true;
    this._flush();
    return { success: true };
  }

  /** Change a character's PIN */
  changePin(name, newPin) {
    const record = this._data[name.toLowerCase()];
    if (!record) return { success: false, error: 'Character not found' };
    record.pin = this._hash(newPin);
    this._dirty = true;
    this._flush();
    return { success: true };
  }

  /** Delete a character by name */
  delete(name) {
    const key = name.toLowerCase();
    if (!this._data[key]) return false;
    delete this._data[key];
    this._dirty = true;
    this._flush();
    return true;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  _hash(pin) {
    return createHash('sha256').update(String(pin) + SALT).digest('hex');
  }

  _sanitize(entry) {
    const { pin, ...rest } = entry;
    return rest;
  }

  async _flush() {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      await writeFile(STORE_PATH, JSON.stringify(this._data, null, 2), 'utf8');
    } catch (e) {
      console.error('CharacterStore: flush failed —', e.message);
      this._dirty = true; // retry next interval
    }
  }
}
