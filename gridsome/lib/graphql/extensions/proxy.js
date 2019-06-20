const { defaultFieldResolver } = require('graphql')

module.exports = {
  description: 'Return value from another field.',
  args: {
    from: 'String'
  },
  apply (ext, config) {
    const resolve = config.resolve || defaultFieldResolver

    return {
      resolve (obj, args, ctx, info) {
        return resolve(obj, args, ctx, { ...info, fieldName: ext.from })
      }
    }
  }
}
