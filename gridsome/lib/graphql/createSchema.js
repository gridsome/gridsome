const directives = require('./directives')
const initMustHaveTypes = require('./types')
const { fieldExtensions } = require('./extensions')
const { scalarTypeResolvers } = require('./resolvers')

const {
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

const {
  SchemaComposer,
  UnionTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const {
  createTypeName,
  CreatedGraphQLType
} = require('./utils')

module.exports = function createSchema (store, context = {}) {
  const { types = [], schemas = [], resolvers = [] } = context
  const schemaComposer = new SchemaComposer()

  initMustHaveTypes(schemaComposer).forEach(typeComposer => {
    schemaComposer.addSchemaMustHaveType(typeComposer)
  })

  directives.forEach(directive => {
    schemaComposer.addDirective(directive)
  })

  types.forEach(typeOrSDL => {
    addTypes(schemaComposer, typeOrSDL)
  })

  const pagesSchema = require('./pages')(schemaComposer)
  const nodesSchema = require('./nodes')(schemaComposer, store)
  const metaData = require('./metaData')(schemaComposer, store)

  schemaComposer.Query.addFields(metaData)
  schemaComposer.Query.addFields(nodesSchema)
  schemaComposer.Query.addFields(pagesSchema)

  for (const typeComposer of schemaComposer.values()) {
    if (!(typeComposer instanceof ObjectTypeComposer)) continue
    if (typeComposer === schemaComposer.Query) continue

    if (typeComposer.getExtension('isUserDefined')) {
      processObjectFields(schemaComposer, typeComposer)
    }

    applyFieldExtensions(typeComposer)
  }

  schemas.forEach(schema => {
    addSchema(schemaComposer, schema)
  })

  resolvers.forEach(resolvers => {
    addResolvers(schemaComposer, resolvers)
  })

  return schemaComposer.buildSchema()
}

function addTypes (schemaComposer, typeOrSDL) {
  if (typeof typeOrSDL === 'string') {
    const sdlTypes = schemaComposer.addTypeDefs(typeOrSDL)
    sdlTypes.forEach(tempTypeComposer => {
      addCreatedType(schemaComposer, tempTypeComposer, true)
    })
  } else if (Array.isArray(typeOrSDL)) {
    typeOrSDL.forEach(type => {
      const tempTypeComposer = createType(schemaComposer, type)
      addCreatedType(schemaComposer, tempTypeComposer)
    })
  } else {
    const tempTypeComposer = createType(schemaComposer, typeOrSDL)
    addCreatedType(schemaComposer, tempTypeComposer)
  }
}

function createType (schemaComposer, type, path = [type.options.name]) {
  if (!type.options.name && path.length === 1) {
    throw new Error(`Missing required type name.`)
  }

  const name = type.options.name || createTypeName(path.join(' '))
  const options = { ...type.options, name }

  switch (type.type) {
    case CreatedGraphQLType.Object:
      return ObjectTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Union:
      return UnionTypeComposer.createTemp(options, schemaComposer)
  }
}

function addCreatedType (schemaComposer, type, isSDL = false) {
  const typeName = schemaComposer.add(type)
  const typeComposer = schemaComposer.get(typeName)

  typeComposer.setExtension('isUserDefined', true)

  if (isSDL && (typeComposer instanceof ObjectTypeComposer)) {
    typeComposer.getDirectives().forEach(directive => {
      typeComposer.setExtension(directive.name, directive.args)
    })

    Object.keys(typeComposer.getFields()).forEach(fieldName => {
      typeComposer.getFieldDirectives(fieldName).forEach(directive => {
        typeComposer.setFieldExtension(fieldName, directive.name, directive.args)
      })
    })
  }

  schemaComposer.addSchemaMustHaveType(typeComposer)
}

function processObjectFields (schemaComposer, typeComposer) {
  const fields = typeComposer.getFields()

  for (const fieldName in fields) {
    const extensions = typeComposer.getFieldExtensions(fieldName)
    const resolver = getFieldResolver(typeComposer, fieldName, extensions)

    if (resolver) {
      extendFieldResolver(typeComposer, fieldName, resolver)
    }
  }
}

function getFieldResolver (typeComposer, fieldName) {
  const fieldComposer = typeComposer.getFieldTC(fieldName)

  if (
    fieldComposer instanceof ObjectTypeComposer &&
    fieldComposer.hasInterface('Node')
  ) {
    const isPlural = typeComposer.isFieldPlural(fieldName)
    const resolverName = isPlural ? 'findMany' : 'findOne'

    return fieldComposer.getResolver(resolverName)
  }

  return scalarTypeResolvers[fieldComposer.getTypeName()]
}

function extendFieldResolver (typeComposer, fieldName, resolver) {
  const fieldConfig = typeComposer.getFieldConfig(fieldName)
  const originalResolver = resolver.resolve || defaultFieldResolver
  const resolve = fieldConfig.resolve || originalResolver

  typeComposer.extendField(fieldName, {
    type: fieldConfig.type || resolver.type,
    args: {
      ...resolver.args,
      ...fieldConfig.args
    },
    resolve (obj, args, ctx, info) {
      return resolve(obj, args, ctx, { ...info, originalResolver })
    }
  })
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
          const newFieldConfig = apply(extensions[key], fieldConfig)

          typeComposer.extendField(fieldName, newFieldConfig)
        }
      })
  })
}

function addSchema (schemaComposer, schema) {
  const typeMap = schema.getTypeMap()
  const queryType = schema.getQueryType()
  const queryComposer = ObjectTypeComposer.createTemp(queryType, schemaComposer)
  const queryFields = queryComposer.getFields()

  schemaComposer.Query.addFields(queryFields)

  for (const typeName in typeMap) {
    const typeDef = typeMap[typeName]

    if (typeDef === queryType) continue
    if (isIntrospectionType(typeDef)) continue
    if (isSpecifiedScalarType(typeDef)) continue

    const typeComposer = schemaComposer.getAnyTC(typeDef.name)
    schemaComposer.addSchemaMustHaveType(typeComposer)
  }
}

function addResolvers (schemaComposer, resolvers = {}) {
  for (const typeName in resolvers) {
    const fields = resolvers[typeName]
    const typeComposer = schemaComposer.getOTC(typeName)

    for (const fieldName in fields) {
      const fieldOptions = fields[fieldName]

      if (typeComposer.hasField(fieldName)) {
        const field = typeComposer.getFieldConfig(fieldName)
        const originalResolver = field.resolve || defaultFieldResolver

        typeComposer.extendField(fieldName, {
          type: fieldOptions.type || field.type,
          args: fieldOptions.args || field.args,
          resolve (obj, args, ctx, info) {
            return fieldOptions.resolve(obj, args, ctx, { ...info, originalResolver })
          }
        })
      } else {
        if (!fieldOptions.type) {
          throw new Error(`${typeName}.${fieldName} must have a 'type' property.`)
        }

        typeComposer.addFields({ [fieldName]: fieldOptions })
      }
    }
  }
}
