class Events {
  constructor () {
    this._events = []
  }

  on (eventName, { api, handler, options = {}}) {
    if (!Array.isArray(this._events[eventName])) {
      this._events[eventName] = []
    }

    this._events[eventName].push({ api, handler, options, done: false })
  }

  async dispatch (eventName, cb, ...args) {
    if (!this._events[eventName]) return []

    const results = []

    for (const entry of this._events[eventName]) {
      if (entry.options.once && entry.done) continue

      const { api, handler } = entry
      const result = typeof cb === 'function'
        ? await handler(cb(api))
        : await handler(...args, api)

      results.push(result)
      entry.done = true
    }

    return results
  }

  dispatchSync (eventName, cb, ...args) {
    if (!this._events[eventName]) return []

    const results = []

    for (const entry of this._events[eventName]) {
      if (entry.options.once && entry.done) continue

      const { api, handler } = entry
      const result = typeof cb === 'function'
        ? handler(cb(api))
        : handler(...args, api)

      results.push(result)
      entry.done = true
    }

    return results
  }
}

module.exports = Events
