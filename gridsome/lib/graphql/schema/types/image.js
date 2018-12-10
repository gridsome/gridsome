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

    if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
      return path.parse(value).base !== value
    }
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

    if (!value) return null

    const result = await context.queue.add(value, args)

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
