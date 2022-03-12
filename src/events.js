export default class EventEmitter {
  constructor() {
    this.events = {};
    this.counter = 0;
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    const token = this.counter++;
    this.events[event].push({
      listener: listener,
      token: token,
    });
    return token;
  }

  emit(event, ...args) {
    if (!this.events[event]) {
      return false;
    }
    this.events[event].forEach((e) => e.listener(...args));
    return true;
  }

  removeListener(event, token) {
    if (this.events[event]) {
      if (token) {
        const index = this.events[event].findIndex((e) => e.token === token);
        if (index > -1) {
          this.events[event].splice(index, 1);
          return true;
        }
      }
    }
    return false;
  }

  removeAllListeners(event) {
    if (this.events[event]) {
      delete this.events[event];
      return true;
    }
    return false;
  }
}