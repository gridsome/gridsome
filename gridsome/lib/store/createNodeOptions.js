const hash = require('hash-sum')
const crypto = require('crypto')
const { pick, omit } = require('lodash')
const processFields = require('./processFields')
const { NODE_FIELDS } = require('../utils/constants')

module.exports = function createNodeOptions (options, contentType, useFallbacks = true) {
  const { nodeOptions, customFields } = normalizeOptions(options, contentType, useFallbacks)

  // call transformer.parse() method
  if (nodeOptions.internal.mimeType && nodeOptions.internal.content) {
    const { mimeType, content } = nodeOptions.internal
    const transformer = contentType._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    const results = transformer.parse(content)

    const {
      nodeOptions: _nodeOptions,
      customFields: _customFields
    } = normalizeOptions(results, contentType, false)

    if (_nodeOptions.id) nodeOptions.id = _nodeOptions.id

    for (const key in _customFields) {
      if (typeof _customFields[key] !== 'undefined') {
        customFields[key] = _customFields[key]
      }
    }
  }

  const { fields, belongsTo } = processFields(customFields, contentType.options.refs, {
    origin: nodeOptions.internal.origin,
    context: contentType._assetsContext,
    camelCased: contentType._camelCasedFieldNames,
    resolveAbsolute: contentType._resolveAbsolutePaths
  })

  return { nodeOptions, fields, belongsTo }
}

function normalizeOptions (options, contentType, useFallbacks) {
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

  nodeOptions.internal = createInternal(contentType, nodeOptions.internal)

  if (useFallbacks) {
    if (!nodeOptions.id) nodeOptions.id = hash(options)
    if (!nodeOptions.$uid) nodeOptions.$uid = genUid(contentType.typeName + nodeOptions.id)
  }

  // TODO: remove before 1.0
  if (nodeOptions._id) nodeOptions.id = nodeOptions._id

  return { nodeOptions, customFields }
}

function genUid (value) {
  return crypto.createHash('md5').update(value).digest('hex')
}

function createInternal (contentType, internal = {}) {
  return {
    typeName: contentType.typeName,
    origin: internal.origin,
    mimeType: internal.mimeType,
    content: internal.content,
    timestamp: Date.now()
  }
}
