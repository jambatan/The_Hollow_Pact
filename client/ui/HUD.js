import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

export class HUD {
  constructor(events) {
    this._player = null;
  }

  update(player) { this._player = player; }

  render(ctx, player, questSystem, partyMembers) {
    if (!player) return;
    const p = player;
    const s = p.stats;

    ctx.save();

    // ─── HP bar ───
    this._bar(ctx, 10, 10, 120, 10, s.current.HP / s.derived.HP, '#0c0', '#300', `HP ${s.current.HP}/${s.derived.HP}`);
    // ─── MP bar ───
    this._bar(ctx, 10, 24, 120, 10, s.current.MP / s.derived.MP, '#44f', '#003', `MP ${s.current.MP}/${s.derived.MP}`);
    // ─── XP bar ───
    const xpPct = p.xp / p.xpToNext;
    this._bar(ctx, 10, 38, 120, 6, xpPct, '#aa0', '#440', `Lv.${p.level}`);

    // ─── Gold ───
    ctx.fillStyle = '#f1c40f';
    ctx.font = '7px monospace';
    ctx.fillText(`${p.gold}g`, 10, 56);

    // ─── Level label ───
    ctx.fillStyle = '#fff';
    ctx.fillText(`Lv.${p.level}`, 50, 56);

    // ─── Party member HP bars ───
    if (partyMembers && partyMembers.size > 0) {
      let py = 66;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(6, py - 4, 128, partyMembers.size * 18 + 4);
      for (const pm of partyMembers.values()) {
        if (!pm.stats) continue;
        const pmHp  = pm.stats.current.HP ?? 0;
        const pmMax = pm.stats.derived.HP ?? 1;
        const hpPct = pmHp / pmMax;
        ctx.fillStyle = '#888';
        ctx.font = '5px monospace';
        ctx.fillText(pm.name, 10, py + 5);
        this._bar(ctx, 48, py, 80, 8, hpPct, pmHp > pmMax * 0.3 ? '#0c0' : '#c40', '#300', `${pmHp}/${pmMax}`);
        py += 18;
      }
    }

    // ─── Controls hint (bottom left) ───
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '5px monospace';
    ctx.fillText('WASD:move  E:talk  SPC:attack  I:bag  J:quests  P:party  `:console', 10, CANVAS_H - 6);

    // ─── Tracked quests (top-right, up to 3) ───
    if (questSystem) {
      const activeQuests = questSystem.getActiveQuests();
      const tracked = [...questSystem.trackedIds]
        .map(id => activeQuests.find(q => q.id === id))
        .filter(Boolean);

      // Fallback: if no tracked, show first active quest
      const toShow = tracked.length > 0 ? tracked : activeQuests.slice(0, 1);

      if (toShow.length > 0) {
        const panelW = 165;
        const panelX = CANVAS_W - panelW - 3;
        let panelY = 8;

        for (const q of toShow) {
          const stage = q.def?.stages?.[q.stage];
          const objCount = stage?.objectives?.length ?? 0;
          const blockH = 22 + objCount * 10;

          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(panelX, panelY, panelW, blockH);
          ctx.strokeStyle = 'rgba(85,136,255,0.3)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(panelX, panelY, panelW, blockH);

          // Quest name with track indicator
          const isTracked = questSystem.trackedIds.has(q.id);
          ctx.fillStyle = '#ffdd88';
          ctx.font = '6px monospace';
          ctx.fillText(`${isTracked ? '★' : ''}${q.def?.name ?? q.id}`, panelX + 4, panelY + 10);

          ctx.fillStyle = '#ccc';
          ctx.font = '5px monospace';
          for (let i = 0; i < objCount; i++) {
            const obj = stage.objectives[i];
            const progKey = obj.enemyIds ? obj.enemyIds.join(',') : (obj.enemyId ?? obj.itemId);
            const prog = q.progress[progKey] ?? 0;
            const done = q.progress[`zone_${obj.zoneId}`] || q.progress[`puzzle_${obj.puzzleId}`]
                      || (prog >= (obj.count ?? 1));
            ctx.fillStyle = done ? '#8f8' : '#ccc';
            const label = obj.type === 'kill'
              ? `• ${obj.label.split('(')[0]} ${prog}/${obj.count}`
              : `• ${obj.label}`;
            ctx.fillText(label, panelX + 4, panelY + 20 + i * 10);
          }

          panelY += blockH + 4;
        }
      }
    }

    ctx.restore();
  }

  _bar(ctx, x, y, w, h, pct, fill, bg, label) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.ceil(w * Math.max(0, Math.min(1, pct))), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = '5px monospace';
      ctx.fillText(label, x + 2, y + h - 1);
    }
  }
}
