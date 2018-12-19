const url = require('url')
const path = require('path')

const {
  GraphQLInt,
  GraphQLJSON
} = require('../../graphql')

const { fieldResolver } = require('../resolvers')
const { SUPPORTED_IMAGE_TYPES } = require('../../../utils/constants')

exports.isImage = value => {
  if (typeof value === 'string') {
    const ext = path.extname(value).toLowerCase()
    const { hostname, pathname } = url.parse(value)

    if (hostname && pathname === '/') {
      return false
    }

    return SUPPORTED_IMAGE_TYPES.includes(ext)
  }

  return false
}

exports.imageType = {
  type: GraphQLJSON,
  args: {
    width: { type: GraphQLInt, description: 'Width' },
    quality: { type: GraphQLInt, description: 'Quality (default: 75)' },
    blur: { type: GraphQLInt, description: 'Blur level for base64 string' }
  },
  async resolve (obj, args, context, info) {
    const value = fieldResolver(obj, args, context, info)
    let result

    if (!value) return null

    try {
      result = await context.queue.add(value, args)
    } catch (err) {
      return null
    }

    return {
      type: result.type,
      mimeType: result.mimeType,
      src: result.src,
      size: result.size,
      sizes: result.sizes,
      srcset: result.srcset,
      dataUri: result.dataUri
    }
  }
}
