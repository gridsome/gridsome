const normalize = require('./normalize')

module.exports = function transform (options, transformers) {
  const { mimeType, content } = options.internal

  if (!mimeType) return options

  const transformer = transformers[mimeType]

  if (!transformer) {
    throw new Error(`No transformer for ${mimeType} is installed.`)
  }

  const transformed = content ? transformer.parse(content) : {}
  const normalized = normalize(transformed, options.typeName, false)

  return mergeResult(normalized, options)
}

function mergeResult (transformed, options) {
  const res = { ...options, fields: { ...options.fields }}
  const { id, title, path, date, fields } = transformed

  if (id) res.id = id
  if (title) res.title = title
  if (path) res.path = path
  if (date) res.date = date

  // TODO: remove before 1.0
  if (fields.content) res.content = fields.content
  if (fields.excerpt) res.excerpt = fields.excerpt

  Object.assign(res.fields, transformed.fields)

  return res
}
