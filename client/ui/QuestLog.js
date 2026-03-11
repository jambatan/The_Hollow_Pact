import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

export class QuestLog {
  constructor(events) {
    this._selected = 0;
  }

  handleInput(input, questSystem) {
    const active = questSystem.getActiveQuests();
    if (input.pressed('ArrowUp'))   this._selected = Math.max(0, this._selected - 1);
    if (input.pressed('ArrowDown')) this._selected = Math.min(active.length - 1, this._selected + 1);
    if (input.pressed('KeyF') || input.pressed('Enter')) {
      const q = active[this._selected];
      if (q) questSystem.toggleTracked(q.id);
    }
  }

  render(ctx, questSystem) {
    if (!questSystem) return;
    const bx = 60, by = 40, bw = CANVAS_W - 120, bh = CANVAS_H - 80;

    ctx.fillStyle = 'rgba(10,10,30,0.96)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#5588ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('QUEST LOG', bx + 10, by + 14);

    const active    = questSystem.getActiveQuests();
    const completed = [...questSystem.completed];

    let y = by + 26;

    // Active quests
    ctx.fillStyle = '#aaddff';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('Active Quests:', bx + 10, y);
    y += 12;

    if (active.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '6px monospace';
      ctx.fillText('None', bx + 20, y);
      y += 12;
    }
    for (let i = 0; i < active.length; i++) {
      const q = active[i];
      const stage = q.def.stages[q.stage];
      const isTracked = questSystem.trackedIds.has(q.id);
      const isSel = i === this._selected;

      // Selection background
      if (isSel) {
        ctx.fillStyle = 'rgba(50,80,150,0.4)';
        ctx.fillRect(bx + 8, y - 7, bw - 16, 10);
      }

      ctx.fillStyle = isSel ? '#fff' : '#ccc';
      ctx.font = '7px monospace';
      ctx.fillText(`${isTracked ? '★' : '☆'} ${q.def.name}`, bx + 10, y);
      y += 10;
      ctx.fillStyle = '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText(`  Stage: ${stage?.title ?? ''}`, bx + 10, y);
      y += 9;
      for (const obj of stage?.objectives ?? []) {
        const prog = q.progress[obj.enemyId ?? obj.itemId] ?? 0;
        const label = obj.type === 'kill' ? `${obj.label.split('(')[0]} (${prog}/${obj.count})` : obj.label;
        const done = q.progress[`zone_${obj.zoneId}`] || q.progress[`puzzle_${obj.puzzleId}`]
                  || (prog >= (obj.count ?? 1));
        ctx.fillStyle = done ? '#8f8' : '#aaa';
        ctx.fillText(`  • ${label}`, bx + 20, y);
        y += 9;
      }
      y += 4;
    }

    // Completed quests
    y += 6;
    ctx.fillStyle = '#88ff88';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('Completed:', bx + 10, y);
    y += 12;
    if (completed.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '6px monospace';
      ctx.fillText('None', bx + 20, y);
    }
    for (const qId of completed) {
      ctx.fillStyle = '#6a6';
      ctx.font = '6px monospace';
      ctx.fillText(`✓ ${questSystem.questDB[qId]?.name ?? qId}`, bx + 10, y);
      y += 10;
      if (y > by + bh - 20) break;
    }

    ctx.fillStyle = '#888';
    ctx.font = '5px monospace';
    ctx.fillText('[↑↓] navigate  [F/Enter] track/untrack (★ max 3)  [J] close', bx + 10, by + bh - 6);
  }
}
