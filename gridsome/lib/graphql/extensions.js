const { defaultFieldResolver } = require('graphql')

const fieldExtensions = {
  reference: {
    args: {
      by: { type: 'String', defaultValue: 'id' }
    },
    apply (ext, fieldConfig) {
      const resolve = fieldConfig.resolve || defaultFieldResolver

      return {
        resolve (obj, args, ctx, info) {
          return resolve(obj, { ...args, ...ext }, ctx, info)
        }
      }
    }
  },
  proxy: {
    args: {
      from: 'String'
    },
    apply (ext, fieldConfig) {
      const resolve = fieldConfig.resolve || defaultFieldResolver

      return {
        resolve (obj, args, ctx, info) {
          return resolve(obj, args, ctx, { ...info, fieldName: ext.from })
        }
      }
    }
  }
}

module.exports = {
  fieldExtensions
}
