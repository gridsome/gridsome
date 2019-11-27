const path = require('path')
const slash = require('slash')
const crypto = require('crypto')
const slugify = require('@sindresorhus/slugify')

exports.hashString = function (string) {
  return crypto.createHash('md5')
    .update(string)
    .digest('hex')
}

exports.pipe = function (funcs, res, ...args) {
  return funcs.reduce(async (res, fn) => {
    return fn(await res, ...args)
  }, Promise.resolve(res))
}

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

exports.isMailtoLink = string => String(string).startsWith('mailto:')

exports.isTelLink = string => String(string).startsWith('tel:')