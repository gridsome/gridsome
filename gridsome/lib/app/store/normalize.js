const hash = require('hash-sum')
const crypto = require('crypto')
const { pick, omit } = require('lodash')
const { NODE_FIELDS } = require('../../utils/constants')

module.exports = function normalize (options, contentType, useFallbacks = true) {
  if (typeof options === 'string') {
    options = { id: options }
  }

  const nodeOptions = pick(options, NODE_FIELDS)
  const customFields = omit(options, NODE_FIELDS)

  // TODO: remove before 1.0
  if (customFields.fields) {
    Object.assign(customFields, customFields.fields)
    delete customFields.fields
  }

  nodeOptions.typeName = contentType.typeName
  nodeOptions.id = options.id || customFields.id || (useFallbacks ? hash(options) : undefined)
  nodeOptions.uid = options.uid || (useFallbacks ? genUid(contentType.typeName + nodeOptions.id) : undefined)
  nodeOptions.title = options.title || customFields.title || nodeOptions.id
  nodeOptions.date = options.date
  nodeOptions.internal = createInternal(options.internal)

  // TODO: remove before 1.0
  if (options._id) nodeOptions.id = options._id
  if (options.content) nodeOptions.content = options.content
  if (options.excerpt) nodeOptions.excerpt = options.excerpt
  if (options.slug) customFields.slug = options.slug

  if (nodeOptions.internal.mimeType && nodeOptions.internal.content) {
    const { mimeType, content } = nodeOptions.internal
    const transformer = contentType._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    const transformed = transformer.parse(content)

    const {
      nodeOptions: _nodeOptions,
      customFields: _customFields
    } = normalize(transformed, contentType, false)

    if (_nodeOptions.id) nodeOptions.id = _nodeOptions.id
    if (_nodeOptions.title) nodeOptions.title = _nodeOptions.title
    if (_nodeOptions.path) nodeOptions.path = _nodeOptions.path
    if (_nodeOptions.date) nodeOptions.date = _nodeOptions.date

    // TODO: remove before 1.0
    if (_customFields.content) customFields.content = _customFields.content
    if (_customFields.excerpt) customFields.excerpt = _customFields.excerpt

    Object.assign(customFields, _customFields)
  }

  return { nodeOptions, customFields }
}

function genUid (value) {
  return crypto.createHash('md5').update(value).digest('hex')
}

function createInternal (internal = {}) {
  return {
    origin: internal.origin,
    mimeType: internal.mimeType,
    content: internal.content,
    timestamp: Date.now()
  }
}
