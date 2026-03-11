import { EVENTS } from '../../shared/constants.js';

export class PuzzleSystem {
  constructor(events) {
    this.events = events;
  }

  update(dt, zone, entities) {
    for (const puzzle of zone.puzzles) {
      if (puzzle.solved) continue;

      // Check all triggers
      let allActive = true;
      for (const trigger of puzzle.triggers) {
        if (trigger.type === 'pressure_plate') {
          // Check if any entity is standing on it
          const occupied = entities.some(e =>
            e.active && (e.tags.has('player') || e.tags.has('enemy')) &&
            e.overlapsRect(trigger.x, trigger.y, trigger.w ?? 16, trigger.h ?? 16)
          );
          trigger.active = occupied;
          if (!occupied) allActive = false;
        }
      }

      if (allActive && puzzle.triggers.length > 0) {
        puzzle.solved = true;
        puzzle.onSolve?.(zone, this.events);
        this.events.emit(EVENTS.PUZZLE_SOLVED, { puzzleId: puzzle.id });
      }
    }
  }
}
