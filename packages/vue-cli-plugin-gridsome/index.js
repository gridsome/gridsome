const apply = require('@gridsome/core')

module.exports = (api, options) => {
  options.gridsome = {
    baseDir: 'src',
    ...options.gridsome
  }

  apply(api, options)
}

module.exports.defaultModes = apply.defaultModes
