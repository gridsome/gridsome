const { defaultFieldResolver } = require('graphql')
const { get } = require('lodash')

module.exports = {
  description: 'Return value from another field.',
  args: {
    from: 'String'
  },
  apply (ext, config) {
    if (typeof ext.from !== 'string') return

    const resolve = config.resolve || defaultFieldResolver
    const fromPath = ext.from.split('.') // only supporting dot notation for now

    return {
      resolve (source, args, context, info) {
        const fieldName = `__${ext.from}__`
        const fieldValue = get(source, fromPath)
        const newSource = { ...source, [fieldName]: fieldValue }
        const newInfo = { ...info, fieldName }

        return resolve(newSource, args, context, newInfo)
      }
    }
  }
}
