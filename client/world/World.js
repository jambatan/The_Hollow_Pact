import { Zone } from './Zone.js';
import { EVENTS } from '../../shared/constants.js';

export class World {
  constructor(events) {
    this.events   = events;
    this._defs    = new Map();  // id → zone definition object
    this._zones   = new Map();  // id → Zone instance (cache)
    this.current  = null;       // active Zone
    this.gameTime = 8 * 60;     // seconds; starts at 8:00 AM (8 * 60s = hour 8)
    this.DAY_LENGTH = 24 * 60;  // seconds per game day
  }

  registerDef(def) {
    this._defs.set(def.id, def);
  }

  async loadZone(zoneId, populateFn) {
    if (!this._zones.has(zoneId)) {
      const def = this._defs.get(zoneId);
      if (!def) throw new Error(`Zone "${zoneId}" not registered`);
      const zone = new Zone(def);
      if (populateFn) populateFn(zone);
      this._zones.set(zoneId, zone);
    }
    this.current = this._zones.get(zoneId);
    this.events.emit(EVENTS.ZONE_CHANGED, { zone: this.current });
    return this.current;
  }

  update(dt) {
    this.gameTime += dt;
    if (this.gameTime >= this.DAY_LENGTH) this.gameTime -= this.DAY_LENGTH;
  }

  // Hour of day 0..24
  get hourOfDay() {
    return (this.gameTime / this.DAY_LENGTH) * 24;
  }
}
