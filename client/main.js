import { Game } from './engine/Game.js';
import { CANVAS_W, CANVAS_H } from '../shared/constants.js';

const canvas = document.getElementById('gameCanvas');

function resize() {
  const dpr    = window.devicePixelRatio || 1;
  const aspect = CANVAS_W / CANVAS_H;
  const wAspect = window.innerWidth / window.innerHeight;

  // Compute CSS display size (fill window, maintain aspect ratio)
  let cssW, cssH;
  if (wAspect > aspect) {
    cssH = window.innerHeight;
    cssW = cssH * aspect;
  } else {
    cssW = window.innerWidth;
    cssH = cssW / aspect;
  }

  // CSS display size
  canvas.style.width  = Math.round(cssW) + 'px';
  canvas.style.height = Math.round(cssH) + 'px';

  // Physical pixel size — exactly matches display pixels so there is no CSS stretching
  const physW = Math.round(cssW * dpr);
  const physH = Math.round(cssH * dpr);
  if (canvas.width !== physW || canvas.height !== physH) {
    canvas.width  = physW;
    canvas.height = physH;
  }
}

window.addEventListener('resize', resize);
resize();

const game = new Game(canvas);
window.__GAME__ = game; // dev console access

game.init().catch(err => {
  console.error('Game failed to initialize:', err);
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  const s = canvas.width / CANVAS_W;
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#f44';
  ctx.font = '12px monospace';
  ctx.fillText('Failed to start: ' + err.message, 20, 50);
  ctx.restore();
});
