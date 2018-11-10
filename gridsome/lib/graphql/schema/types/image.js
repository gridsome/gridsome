const fs = require('fs')
const path = require('path')

const { GraphQLJSON } = require('../../graphql')
const { fieldResolver } = require('../resolvers')
const { SUPPORTED_IMAGE_TYPES } = require('../../../utils/constants')

exports.isImage = value => {
  if (typeof value === 'string') {
    const ext = path.extname(value).toLowerCase()

    if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
      return true
    }
  }

  return false
}

exports.imageType = {
  type: GraphQLJSON,
  args: {},
  async resolve (obj, args, context, info) {
    const value = fieldResolver(obj, args, context, info)
    const result = await context.queue.add(value)

    return {
      src: result.src,
      size: result.size,
      sizes: result.sizes,
      srcset: result.srcset,
      dataUri: result.dataUri
    }
  }
}
