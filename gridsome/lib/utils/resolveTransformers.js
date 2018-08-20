const { camelCase } = require('lodash')
const { cache, nodeCache } = require('./cache')
const { internalRE, transformerRE } = require('./index')

module.exports = service => {
  const { transformers = {}} = service.options
  const { dependencies = {}, devDependencies = {}} = service.pkg
  const deps = Object.keys({
    ...dependencies,
    ...devDependencies,
    ...transformers
  })

  const result = {}

  for (let id of deps) {
    let matches = id.match(transformerRE)

    if (internalRE.test(id)) {
      id = id.replace(internalRE, '../')
      matches = []
    }

    if (!matches) continue

    // TODO: transformers looks for base config in gridsome.config.js
    // - @gridsome/transformer-remark -> config.transformers.remark
    // - @foo/gridsome-transformer-remark -> config.transformers.remark
    // - gridsome-transformer-foo-bar -> config.transformers.fooBar

    const [,, suffix] = matches
    const TransformerClass = require(id)
    const options = service.config.transformers[camelCase(suffix)] || {}
    const transformer = new TransformerClass(options, { cache, nodeCache })

    for (const mimeType of TransformerClass.mimeTypes()) {
      result[mimeType] = transformer
    }
  }

  return result
}
