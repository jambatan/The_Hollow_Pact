export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._listeners.get(event);
    if (list) {
      const i = list.indexOf(fn);
      if (i !== -1) list.splice(i, 1);
    }
  }

  emit(event, data) {
    const list = this._listeners.get(event);
    if (list) {
      for (const fn of list.slice()) fn(data);
    }
  }

  once(event, fn) {
    const wrapper = (data) => { fn(data); this.off(event, wrapper); };
    this.on(event, wrapper);
  }
}
