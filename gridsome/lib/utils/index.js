const path = require('path')
const slash = require('slash')
const slugify = require('@sindresorhus/slugify')

exports.forwardSlash = function (input) {
  return slash(input)
}

exports.slugify = function (value) {
  return slugify(String(value), { separator: '-' })
}

exports.safeKey = function (value) {
  return String(value).replace(/\./g, '-')
}

exports.createPath = function (value, page = 1, isIndex = true) {
  const _segments = value.split('/').filter(v => !!v)

  if (page > 1) _segments.push(page)

  return {
    toUrlPath () {
      return `/${_segments.join('/')}`
    },
    toFilePath (context, ext) {
      const segments = _segments.map(s => decodeURIComponent(s))
      const fileName = isIndex ? `index.${ext}` : `${segments.pop() || 'index'}.${ext}`
      return path.join(context, ...segments, fileName)
    }
  }
}

exports.isResolvablePath = function (value) {
  return (
    typeof value === 'string' &&
    path.extname(value).length > 1 &&
    (value.startsWith('.') || path.isAbsolute(value))
  )
}
