export class ScheduleSystem {
  // gameTime in seconds; DAY_LENGTH in seconds
  static DAY_LENGTH = 24 * 60;

  update(dt, zone, world) {
    const hourOfDay = world.hourOfDay; // 0..24

    for (const entity of zone.entities) {
      if (!entity.tags.has('npc') || !entity.schedule?.length) continue;
      if (entity._followPlayer) continue; // don't overwrite escort follow target
      const slot = this._currentSlot(entity.schedule, hourOfDay);
      if (!slot) continue;
      // Update NPC target position
      entity.setScheduleTarget?.(slot.x, slot.y, slot.state);
    }
  }

  _currentSlot(schedule, hour) {
    for (const slot of schedule) {
      if (slot.timeStart < slot.timeEnd) {
        if (hour >= slot.timeStart && hour < slot.timeEnd) return slot;
      } else {
        // Wraps midnight
        if (hour >= slot.timeStart || hour < slot.timeEnd) return slot;
      }
    }
    return schedule[0];
  }
}
