const url = require('url')
const path = require('path')
const isUrl = require('is-url')
const mime = require('mime-types')
const camelCase = require('camelcase')
const isRelative = require('is-relative')
const { isPlainObject } = require('lodash')
const { isResolvablePath } = require('../utils')

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

exports.createFieldName = function (key, camelCased = false) {
  key = key.replace(nonValidCharsRE, '_')
  if (camelCased) key = camelCase(key)
  key = key.replace(leadingNumberRE, '_$1')

  return key
}

exports.isRefField = function (field) {
  return (
    isPlainObject(field) &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('id')
  )
}

exports.parseUrl = function (input) {
  const { protocol, host, path: pathName } = url.parse(input)
  const basePath = pathName.endsWith('/') ? pathName : path.dirname(pathName)
  const baseUrl = `${protocol}//${host}`
  const fullUrl = `${baseUrl}${path.posix.join(basePath, '/')}`

  return {
    baseUrl,
    basePath,
    fullUrl
  }
}

exports.resolvePath = function (origin, toPath, options = {}) {
  const { context = null, resolveAbsolute = false } = options

  if (typeof toPath !== 'string') return toPath
  if (typeof origin !== 'string') return toPath
  if (isUrl(toPath)) return toPath
  if (!isResolvablePath(toPath)) return toPath

  const mimeType = mime.lookup(toPath)

  if (!mimeType) return toPath
  if (mimeType === 'application/x-msdownload') return toPath

  const url = isUrl(origin) ? exports.parseUrl(origin) : null
  const contextPath = url && resolveAbsolute === true ? url.baseUrl : context
  const fromPath = url ? url.fullUrl : origin
  const resolver = url ? path.posix : path

  if (path.isAbsolute(toPath) && !resolveAbsolute) {
    return toPath
  }

  if (isRelative(toPath)) {
    if (!fromPath) return toPath
    const { rootPath, basePath } = parsePath(fromPath)
    return rootPath + resolver.resolve(basePath, toPath)
  }

  if (typeof contextPath === 'string') {
    if (isUrl(contextPath)) {
      const { rootPath, basePath } = parsePath(contextPath)
      return rootPath + resolver.join(basePath, toPath)
    }
    return resolver.join(contextPath, toPath)
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
