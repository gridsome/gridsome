const fs = require('fs')
const path = require('path')

class SassResourcesLoaderPlugin {
  static defaultOptions () {
    return {
      resources: []
    }
  }

  constructor (api, userOptions) {
    api.chainWebpack(config => {
      const defaults = SassResourcesLoaderPlugin.defaultOptions()
      const options = Object.assign({}, defaults, userOptions)

      // casts the provided resource as an array if it's not one.
      options.resources = Array.isArray(options.resources) ? options.resources : [options.resources]

      // resolve modules and alias by webpack config
      options.resources = this.resolveModulesDir(options.resources, config)
      options.resources = this.resolveAlias(options.resources, config)

      const targets = [
        config.module.rule('scss').oneOf('modules').resourceQuery(/module/),
        config.module.rule('scss').oneOf('normal')
      ]

      targets.forEach(target => this.attachPlugin(target, options.resources))
    })
  }

  attachPlugin (rule, resources) {
    rule
      .use('sass-resources-loader')
      .loader('sass-resources-loader')
      .options({ resources })
  }

  resolveAlias (resources, config) {
    const alias = config.resolve.alias.entries()

    return resources.map(_path => {
      let resolvePath = _path

      // try to resolve alias path
      Object.entries(alias).forEach(([key, value]) => {
        if (resolvePath.indexOf(key) === 0) {
          const resolveCandidate = resolvePath.replace(key, value)
          if (this.existsSync(resolveCandidate)) {
            resolvePath = resolveCandidate
          }
        }
      })

      return resolvePath
    })
  }

  resolveModulesDir (resources, config) {
    const modulesDir = config.resolve.modules.values()

    return resources.map(_path => {
      let resolvePath = _path

      // try to resolve modules path
      modulesDir.forEach(dir => {
        const resolveCandidate = path.resolve(dir, _path)
        if (this.existsSync(resolveCandidate)) {
          resolvePath = resolveCandidate
        }
      })

      return resolvePath
    })
  }

  existsSync (path) {
    try {
      fs.accessSync(path)
      return true
    } catch (_) {
      return false
    }
  }
}

module.exports = SassResourcesLoaderPlugin

