// Stub SkillBook — full skill system for Stage 7
export class SkillBook {
  constructor() {
    this.skills = new Map();
    this._cooldowns = new Map();
  }

  register(id, def) { this.skills.set(id, def); }
  isOnCooldown(id)   { return (this._cooldowns.get(id) ?? 0) > 0; }

  update(dt) {
    for (const [id, t] of this._cooldowns) {
      if (t > 0) this._cooldowns.set(id, t - dt);
    }
  }

  use(id, caster, targets, events) {
    const def = this.skills.get(id);
    if (!def || this.isOnCooldown(id)) return false;
    if (caster.stats.mp < (def.mpCost ?? 0)) return false;
    caster.stats.current.MP -= (def.mpCost ?? 0);
    def.execute(caster, targets, events);
    this._cooldowns.set(id, def.cooldown ?? 1);
    return true;
  }
}
