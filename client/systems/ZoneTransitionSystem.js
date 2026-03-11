import { EVENTS } from '../../shared/constants.js';

export class ZoneTransitionSystem {
  constructor(events) {
    this.events = events;
    this._cooldown = 0; // prevent rapid re-triggering
  }

  update(dt, zone, players) {
    if (this._cooldown > 0) { this._cooldown -= dt; return; }

    for (const player of players) {
      if (!player.isLocal || !player.active) continue;
      for (const transition of zone.transitions) {
        const r = transition.rect;
        if (player.overlapsRect(r.x, r.y, r.w, r.h)) {
          this._cooldown = 1.5;
          this.events.emit(EVENTS.ZONE_TRANSITION, {
            player,
            toZone: transition.toZone,
            toX: transition.toX ?? player.x,
            toY: transition.toY ?? player.y,
          });
          return;
        }
      }
    }
  }
}
