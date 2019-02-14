const url = require('url')
const path = require('path')
const mime = require('mime-types')
const { GraphQLScalarType } = require('graphql')
const { fieldResolver } = require('../resolvers')
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

exports.GraphQLFile = new GraphQLScalarType({
  name: 'File',
  serialize: value => value
})

exports.fileType = {
  type: exports.GraphQLFile,
  args: {},
  async resolve (obj, args, context, info) {
    const value = fieldResolver(obj, args, context, info)

    if (!value) return null

    const result = await context.queue.add(value)

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
