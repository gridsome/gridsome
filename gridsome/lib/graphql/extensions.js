const { defaultFieldResolver } = require('graphql')

const fieldExtensions = {
  proxy: {
    args: {
      fieldName: 'String'
    },
    apply (ext, fieldConfig) {
      const resolve = fieldConfig.resolve || defaultFieldResolver

      return {
        resolve (obj, args, ctx, info) {
          return resolve(obj, args, ctx, { ...info, ...ext })
        }
      }
    }
  }
}

module.exports = {
  fieldExtensions
}
