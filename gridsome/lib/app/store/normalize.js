const hash = require('hash-sum')
const crypto = require('crypto')
const { pick, omit } = require('lodash')
const { NODE_FIELDS } = require('../../utils/constants')

module.exports = function normalize (options, typeName, useFallbacks = true) {
  if (typeof options === 'string') {
    options = { id: options }
  }

  const node = pick(options, NODE_FIELDS)
  const fields = omit(options, NODE_FIELDS)

  // TODO: remove before 1.0
  if (fields.fields) {
    Object.assign(fields, fields.fields)
    delete fields.fields
  }

  node.typeName = typeName
  node.id = options.id || fields.id || (useFallbacks ? hash(options) : undefined)
  node.uid = options.uid || (useFallbacks ? genUid(typeName + node.id) : undefined)
  node.title = options.title || fields.title || node.id
  node.date = options.date
  node.internal = normalizeInternal(options.internal)

  // TODO: remove before 1.0
  if (options._id) node.id = options._id
  if (options.content) node.content = options.content
  if (options.excerpt) node.excerpt = options.excerpt

  return { ...node, fields }
}

function genUid (value) {
  return crypto.createHash('md5').update(value).digest('hex')
}

function normalizeInternal (internal = {}) {
  return {
    origin: internal.origin,
    mimeType: internal.mimeType,
    content: internal.content,
    timestamp: Date.now()
  }
}
