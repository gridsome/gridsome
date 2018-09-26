import Vue from 'vue'
import plugins from 'plugins-loader!@gridsome/temp/plugins.js'

const isServer = process.isServer === true
const isClient = process.isClient === true

class Plugins {
  constructor () {
    this.plugins = plugins.map(({ PluginClass, options }) => {
      return new PluginClass(options, { Vue, isServer, isClient })
    })
  }

  callHook (hook, ...args) {
    return Promise.all(this.plugins.map(plugin => {
      return this.callMethod(plugin, hook, args)
    }))
  }

  callHookSync (hook, ...args) {
    return this.plugins.map(plugin => {
      return this.callMethod(plugin, hook, args)
    })
  }

  callMethod (plugin, name, args) {
    return typeof plugin[name] === 'function'
      ? plugin[name](...args, { isServer, isClient })
      : null
  }
}

export default Plugins
