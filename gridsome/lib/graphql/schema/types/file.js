const url = require('url')
const path = require('path')
const mime = require('mime-types')

const { GraphQLJSON } = require('../../graphql')
const { fieldResolver } = require('../resolvers')
const { SUPPORTED_IMAGE_TYPES } = require('../../../utils/constants')

exports.isFile = value => {
  if (typeof value === 'string') {
    const mimeType = mime.lookup(value)
    const ext = path.extname(value).toLowerCase()

    if (ext.length && mimeType && mimeType !== 'application/x-msdownload') {
      const { hostname, pathname } = url.parse(value)

      if (hostname && pathname === '/') {
        return false
      }

      return !SUPPORTED_IMAGE_TYPES.includes(ext)
    }
  }

  return false
}

exports.fileType = {
  type: GraphQLJSON,
  args: {},
  async resolve (obj, args, context, info) {
    const value = fieldResolver(obj, args, context, info)

    if (!value) return null

    const result = await context.queue.add(value)

    return {
      type: result.type,
      mimeType: result.mimeType,
      src: result.src
    }
  }
}
