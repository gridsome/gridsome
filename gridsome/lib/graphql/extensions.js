const {
  defaultFieldResolver,
  GraphQLDirective,
  DirectiveLocation
} = require('graphql')

const ObjectExtension = 'ObjectExtension'
const FieldExtension = 'FieldExtension'

const objectExtensions = {
  infer: {
    type: ObjectExtension,
    description: 'Add fields from field values.'
  }
}

const fieldExtensions = {
  reference: {
    type: FieldExtension,
    description: 'Reference node by a custom field value.',
    args: {
      by: { type: 'String', defaultValue: 'id' }
    },
    apply (ext, config, { typeComposer, fieldName }) {
      const resolve = config.resolve || defaultFieldResolver
      const isPlural = typeComposer.isFieldPlural(fieldName)

      if (isPlural) {
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
  },
  proxy: {
    type: FieldExtension,
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
}

function applyFieldExtensions (typeComposer) {
  typeComposer.getFieldNames().forEach(fieldName => {
    const extensions = typeComposer.getFieldExtensions(fieldName)

    Object.keys(extensions)
      .sort(key => key === 'proxy')
      .forEach(key => {
        const { apply } = fieldExtensions[key] || {}

        if (apply) {
          const fieldConfig = typeComposer.getFieldConfig(fieldName)
          const newFieldConfig = apply(extensions[key], fieldConfig, {
            typeComposer,
            fieldName
          })

          typeComposer.extendField(fieldName, newFieldConfig)
        }
      })
  })
}

function addDirectives (schemaComposer, customExtensions = {}) {
  const allExtensions = {
    ...customExtensions,
    ...objectExtensions,
    ...fieldExtensions
  }

  for (const name in allExtensions) {
    const extension = allExtensions[name]
    const location = extension.type === FieldExtension
      ? DirectiveLocation.FIELD_DEFINITION
      : DirectiveLocation.OBJECT

    const directive = new GraphQLDirective({
      args: normalizeArgs(schemaComposer, extension.args),
      description: extension.description,
      locations: [location],
      name
    })

    schemaComposer.addDirective(directive)
  }
}

function normalizeArgs (schemaComposer, args = {}) {
  const res = {}

  for (const key in args) {
    const value = args[key]
    const config = typeof value === 'string'
      ? { type: value }
      : value

    if (typeof config.type === 'string') {
      config.type = schemaComposer.typeMapper
        .getBuiltInType(config.type)
        .getType()
    }

    res[key] = config
  }

  return res
}

module.exports = {
  applyFieldExtensions,
  addDirectives
}
