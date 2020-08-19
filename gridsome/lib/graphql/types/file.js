const url = require('url')
const path = require('path')
const mime = require('mime-types')
const { isResolvablePath } = require('../../utils')
const { SUPPORTED_IMAGE_TYPES } = require('../../utils/constants')

exports.isFile = value => {
  if (typeof value === 'string') {
    const mimeType = mime.lookup(value)
    const ext = path.extname(value).toLowerCase()

    if (ext.length && mimeType && mimeType !== 'application/x-msdownload') {
      const { hostname, pathname } = url.parse(value)

      if (hostname && pathname === '/') {
        return false
      }

      return (
        !SUPPORTED_IMAGE_TYPES.includes(ext) &&
        isResolvablePath(value)
      )
    }
  }

  return false
}

exports.createFileScalar = schemaComposer => {
  return schemaComposer.createScalarTC({
    name: 'File',
    serialize: value => value
  })
}

exports.fileType = {
  type: 'File',
  args: {},
  async resolve (obj, args, context, { fieldName }) {
    const value = obj[fieldName]

    if (!value) return null

    const result = await context.assets.add(value)

    if (result.isUrl) {
      return result.src
    }

    return {
      type: result.type,
      mimeType: result.mimeType,
      src: result.src
    }
  }
}
