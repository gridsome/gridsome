const url = require('url')
const path = require('path')
const slash = require('slash')
const mime = require('mime-types')
const isRelative = require('is-relative')

exports.forwardSlash = function (input) {
  return slash(input)
}

exports.resolvePath = function (fromPath, toPath, isAbsolute, { context }) {
  if (typeof toPath !== 'string') return toPath
  if (typeof fromPath !== 'string') return toPath
  if (path.extname(toPath).length <= 1) return toPath
  if (/^(https?:)?\/{2}\w+/.test(toPath)) return toPath
  if (mime.lookup(toPath) === 'application/x-msdownload') return toPath
  if (!mime.lookup(toPath)) return toPath

  let isUrl = false
  let dirName = path.dirname(fromPath)

  const joinUrl = (...parts) => {
    return context + exports.forwardSlash(path.join('/', ...parts))
  }

  if (/^(https?:)?\/{2}\w+/.test(fromPath)) {
    const info = url.parse(fromPath.replace(/[^/]*\/?$/, ''))
    context = `${info.protocol}//${info.host}`
    dirName = info.path.replace(/\/+$/, '')
    isUrl = true
  }

  if (typeof isAbsolute === 'string' && path.isAbsolute(isAbsolute)) {
    return isUrl ? joinUrl(isAbsolute, toPath) : path.join(isAbsolute, toPath)
  } else if (isAbsolute === true && !isRelative(toPath)) {
    return isUrl ? joinUrl(toPath) : path.join(context, toPath)
  } else if (isRelative(toPath)) {
    return isUrl
      ? joinUrl(path.resolve(dirName, toPath))
      : path.resolve(dirName, toPath)
  }

  return toPath
}
