// Manages base + derived stats, current HP/MP, equipment modifiers
export class StatBlock {
  constructor(base = {}) {
    this.base = {
      STR: base.STR ?? 5,
      DEX: base.DEX ?? 5,
      INT: base.INT ?? 3,
      CON: base.CON ?? 5,
      WIS: base.WIS ?? 3,
      CHA: base.CHA ?? 3,
    };

    // Bonus stats from equipment / buffs (additive)
    this.bonus = { STR: 0, DEX: 0, INT: 0, CON: 0, WIS: 0, CHA: 0 };

    // Computed derived stats (call recalc() after any change)
    this.derived = this._computeDerived();

    // Current resource pools
    this.current = {
      HP: this.derived.HP,
      MP: this.derived.MP,
    };
  }

  // Total effective stat (base + bonus)
  get(stat) { return (this.base[stat] ?? 0) + (this.bonus[stat] ?? 0); }

  recalc() {
    const prev = { HP: this.derived.HP, MP: this.derived.MP };
    this.derived = this._computeDerived();

    // Scale current resources with max changes (proportionally)
    if (prev.HP > 0) this.current.HP = Math.round(this.current.HP / prev.HP * this.derived.HP);
    if (prev.MP > 0) this.current.MP = Math.round(this.current.MP / prev.MP * this.derived.MP);

    // Clamp
    this.current.HP = Math.max(0, Math.min(this.current.HP, this.derived.HP));
    this.current.MP = Math.max(0, Math.min(this.current.MP, this.derived.MP));
  }

  _computeDerived() {
    const s = this;
    return {
      HP:  s.get('CON') * 10,
      MP:  s.get('INT') * 8 + s.get('WIS') * 4,
      ATK: s.get('STR') * 2,
      DEF: Math.floor(s.get('CON') / 2),
      SPD: s.get('DEX') * 5 + 30,     // base 30 px/s + DEX
      CRIT_CHANCE: s.get('DEX') * 0.5, // percent
      MAGIC_ATK: s.get('INT') * 2,
    };
  }

  // Convenience
  get hp()    { return this.current.HP; }
  get mp()    { return this.current.MP; }
  get maxHp() { return this.derived.HP; }
  get maxMp() { return this.derived.MP; }
  get isDead(){ return this.current.HP <= 0; }

  heal(amount) {
    this.current.HP = Math.min(this.current.HP + amount, this.derived.HP);
  }
  restoreMp(amount) {
    this.current.MP = Math.min(this.current.MP + amount, this.derived.MP);
  }
  takeDamage(amount) {
    const actual = Math.max(1, amount - this.derived.DEF);
    this.current.HP = Math.max(0, this.current.HP - actual);
    return actual;
  }
}
