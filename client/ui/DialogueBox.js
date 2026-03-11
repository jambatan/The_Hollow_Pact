import { CANVAS_W, CANVAS_H } from '../../shared/constants.js';

export class DialogueBox {
  render(ctx, dialogueSystem) {
    const node = dialogueSystem.currentNode;
    if (!node) return;

    const bx = 20, by = CANVAS_H - 160, bw = CANVAS_W - 40, bh = 150;

    // Background
    ctx.fillStyle = 'rgba(10,10,30,0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#5588ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // Speaker name
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(node.speaker ?? '', bx + 10, by + 14);

    // Text (word-wrapped)
    ctx.fillStyle = '#eee';
    ctx.font = '7px monospace';
    this._wrapText(ctx, node.text ?? '', bx + 10, by + 28, bw - 20, 10);

    // Choices
    const choices = node.choices ?? [];
    for (let i = 0; i < Math.min(choices.length, 4); i++) {
      ctx.fillStyle = '#aaddff';
      ctx.font = '6px monospace';
      ctx.fillText(`[${i + 1}] ${choices[i].text}`, bx + 10, by + 90 + i * 14);
    }
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let lineY = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, lineY);
        line = word;
        lineY += lineH;
        if (lineY > y + lineH * 5) break; // max 6 lines
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, lineY);
  }
}
