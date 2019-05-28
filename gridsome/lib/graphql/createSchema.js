const directives = require('./directives')
const initMustHaveTypes = require('./types')

const {
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

const {
  SchemaComposer,
  ObjectTypeComposer,
  UnionTypeComposer
} = require('graphql-compose')

const {
  CreatedGraphQLType,
  isCreatedType,
  createTypeName
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
      addCreatedType(schemaComposer, tempTypeComposer)
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
      const fields = {}

      for (const fieldName in type.options.fields) {
        const field = type.options.fields[fieldName]

        fields[fieldName] = isCreatedType(field.type)
          ? createType(schemaComposer, field.type, path.concat(`ObjectField ${fieldName}`))
          : field
      }

      const typeOptions = { ...options, fields }
      const typeComposer = ObjectTypeComposer.createTemp(typeOptions, schemaComposer)

      typeComposer.setExtension('config', options.config || {})
      typeComposer.addFields(fields)

      return typeComposer

    case CreatedGraphQLType.Union:
      return UnionTypeComposer.createTemp(options, schemaComposer)
  }
}

function addCreatedType (schemaComposer, type) {
  const typeName = schemaComposer.add(type)
  const typeComposer = schemaComposer.get(typeName)

  schemaComposer.addSchemaMustHaveType(typeComposer)
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
        const defaultResolver = field.resolve || defaultFieldResolver

        typeComposer.extendField(fieldName, {
          type: fieldOptions.type || field.type,
          args: fieldOptions.args || field.args,
          resolve (obj, args, ctx, info) {
            return fieldOptions.resolve(obj, args, ctx, { ...info, defaultResolver })
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
