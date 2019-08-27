class ComponentParser {
  constructor () {
    this._cached = {}
    this._parsers = []
  }

  add (options) {
    this._parsers.push(options)
  }

  parse (component, useCache = true) {
    const parser = this._parsers.find(options => {
      return component.match(options.test)
    })

    if (!parser) return {}

    if (useCache && this._cached[component]) {
      return this._cached[component]
    }

    const results = this._cached[component] = parser.parse(component)

    return results
  }
}

module.exports = ComponentParser
