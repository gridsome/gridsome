const { defaultFieldResolver } = require('graphql')

module.exports = {
  description: 'Add reference resolver.',
  args: {
    by: {
      type: 'String',
      defaultValue: 'id',
      description: 'Reference node by a custom field value.'
    }
  },
  apply (ext, config, { typeComposer, fieldName }) {
    const resolve = config.resolve || defaultFieldResolver

    if (typeComposer.isFieldPlural(fieldName)) {
      const refTypeComposer = typeComposer.getFieldTC(fieldName)
      const referenceManyAdvanced = refTypeComposer.getResolver('referenceManyAdvanced')
      const resolve = referenceManyAdvanced.getResolve()

      return {
        args: referenceManyAdvanced.getArgs(),
        resolve (source, args, context, info) {
          return resolve({ source, args: { ...args, by: ext.by }, context, info })
        }
      }
    }

    return {
      resolve (source, args, context, info) {
        return resolve(source, { ...args, by: ext.by }, context, info)
      }
    }
  }
}
