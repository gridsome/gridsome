const { camelCase } = require('lodash')
const Transformer = require('../Transformer')
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
    // - gridsome-transformer-remark -> config.transformers.remark

    const [,, suffix] = matches
    const TransformerPlugin = require(id)
    const config = service.config.transformers[camelCase(suffix)] || {}
    const transformer = new TransformerPlugin(service, config)

    if (!(transformer instanceof Transformer)) {
      throw new Error(`${id} is not a valid transformer.`)
    }

    for (const mimeType of TransformerPlugin.mimeTypes()) {
      result[mimeType] = transformer
    }
  }

  return result
}
