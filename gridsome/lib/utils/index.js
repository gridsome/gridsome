const url = require('url')
const path = require('path')
const slash = require('slash')
const isUrl = require('is-url')
const mime = require('mime-types')
const isRelative = require('is-relative')
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

exports.parseUrl = function (input) {
  const { protocol, host, path: pathName } = url.parse(input)
  const basePath = pathName.endsWith('/') ? pathName : path.dirname(pathName)
  const baseUrl = `${protocol}//${host}`
  const fullUrl = `${baseUrl}${path.join(basePath, '/')}`

  return {
    baseUrl,
    basePath,
    fullUrl
  }
}

exports.isResolvablePath = function (value) {
  return (
    typeof value === 'string' &&
    path.extname(value).length > 1 &&
    (value.startsWith('.') || path.isAbsolute(value))
  )
}

exports.resolvePath = function (fromPath, toPath, rootDir) {
  if (typeof toPath !== 'string') return toPath
  if (typeof fromPath !== 'string') return toPath
  if (path.extname(toPath).length <= 1) return toPath
  if (isUrl(toPath)) return toPath
  if (mime.lookup(toPath) === 'application/x-msdownload') return toPath
  if (!mime.lookup(toPath)) return toPath

  if (isRelative(toPath)) {
    if (!fromPath) return toPath
    const { rootPath, basePath } = parsePath(fromPath)
    return rootPath + path.resolve(basePath, toPath)
  }

  if (rootDir) {
    const { rootPath, basePath } = parsePath(rootDir)
    return rootPath + path.join(basePath, toPath)
  }

  return toPath
}

function parsePath (string) {
  let rootPath = ''
  let basePath = string

  if (isUrl(string)) {
    const info = exports.parseUrl(string)
    rootPath = info.baseUrl
    basePath = info.basePath
  } else {
    if (path.extname(basePath).length) {
      basePath = path.join(path.dirname(basePath), '/')
    } else {
      basePath = path.join(basePath, '/')
    }
  }

  return {
    rootPath,
    basePath
  }
}
