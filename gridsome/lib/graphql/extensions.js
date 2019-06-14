const {
  defaultFieldResolver,
  GraphQLDirective,
  DirectiveLocation
} = require('graphql')

const types = {
  ObjectExtension: 'ObjectExtension',
  FieldExtension: 'FieldExtension'
}

const objectExtensions = {
  infer: {
    type: types.ObjectExtension,
    description: 'Add fields from field values.'
  }
}

const fieldExtensions = {
  reference: {
    type: types.FieldExtension,
    description: 'Reference node by a custom field value.',
    args: {
      by: { type: 'String', defaultValue: 'id' }
    },
    apply (ext, config) {
      const resolve = config.resolve || defaultFieldResolver

      return {
        resolve (obj, args, ctx, info) {
          return resolve(obj, { ...args, ...ext }, ctx, info)
        }
      }
    }
  },
  proxy: {
    type: types.FieldExtension,
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

function addDirectives (schemaComposer, customExtensions = {}) {
  const allExtensions = {
    ...customExtensions,
    ...objectExtensions,
    ...fieldExtensions
  }

  for (const name in allExtensions) {
    const extension = allExtensions[name]
    const location = extension.type === types.FieldExtension
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
  fieldExtensions,
  addDirectives
}
