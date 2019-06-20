const { GraphQLDirective, DirectiveLocation } = require('graphql')

const objectExtensions = {
  infer: {
    description: 'Add fields from field values.'
  }
}

const fieldExtensions = {
  reference: require('./reference'),
  proxy: require('./proxy')
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

function addDirectives (schemaComposer) {
  const { OBJECT, FIELD_DEFINITION } = DirectiveLocation

  addExtensionDirectives(schemaComposer, objectExtensions, OBJECT)
  addExtensionDirectives(schemaComposer, fieldExtensions, FIELD_DEFINITION)
}

function addExtensionDirectives (schemaComposer, extensions, location) {
  for (const name in extensions) {
    const extension = extensions[name]

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
