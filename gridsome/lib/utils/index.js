const url = require('url')
const path = require('path')
const slash = require('slash')
const isUrl = require('is-url')
const mime = require('mime-types')
const isRelative = require('is-relative')

exports.forwardSlash = function (input) {
  return slash(input)
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

exports.resolvePath = function (fromPath, toPath, rootDir) {
  if (typeof toPath !== 'string') return toPath
  if (typeof fromPath !== 'string') return toPath
  if (path.extname(toPath).length <= 1) return toPath
  if (isUrl(toPath)) return toPath
  if (mime.lookup(toPath) === 'application/x-msdownload') return toPath
  if (!mime.lookup(toPath)) return toPath

  const parse = string => {
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

  if (isRelative(toPath)) {
    const { rootPath, basePath } = parse(fromPath)
    return rootPath + path.resolve(basePath, toPath)
  }

  if (rootDir) {
    const { rootPath, basePath } = parse(rootDir)
    return rootPath + path.join(basePath, toPath)
  }

  return toPath
}
