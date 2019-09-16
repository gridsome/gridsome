const { omit } = require('lodash')
const normalizeNodeOptions = require('./normalizeNodeOptions')

module.exports = function transformNodeContent (node, collection) {
  const { mimeType, content } = node.internal
  const { _mimeTypes } = collection

  if (mimeType) {
    const transformer = collection._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for '${mimeType}' is installed.`)
    }

    // add transformer to content type to let it
    // extend the node type when creating schema
    if (mimeType && !_mimeTypes.hasOwnProperty(mimeType)) {
      _mimeTypes[mimeType] = transformer
    }

    const results = content ? transformer.parse(content) : {}
    const options = normalizeNodeOptions(results, collection, false)
    const customFields = omit(options, ['$uid', 'internal'])

    for (const key in customFields) {
      if (typeof customFields[key] !== 'undefined') {
        node[key] = customFields[key]
      }
    }
  }

  return node
}
