const { SchemaComposer, ObjectTypeComposer } = require('graphql-compose')
const initSharedTypes = require('./types')

const {
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

module.exports = function createSchema (store, { schemas = [], resolvers = [] } = {}) {
  const schemaComposer = new SchemaComposer()

  initSharedTypes(schemaComposer).forEach(typeDef => {
    schemaComposer.addSchemaMustHaveType(typeDef)
  })

  const directives = require('./directives')
  const pagesSchema = require('./pages')(schemaComposer)
  const nodesSchema = require('./nodes')(schemaComposer, store)
  const metaData = require('./metaData')(schemaComposer, store)

  schemaComposer.Query.addFields(metaData)
  schemaComposer.Query.addFields(nodesSchema)
  schemaComposer.Query.addFields(pagesSchema)

  directives.forEach(directive => {
    schemaComposer.addDirective(directive)
  })

  schemas.forEach(schema => {
    addSchema(schemaComposer, schema)
  })

  resolvers.forEach(resolvers => {
    addFieldResolvers(schemaComposer, resolvers)
  })

  return schemaComposer.buildSchema()
}

function addSchema (schemaComposer, schema) {
  const typeMap = schema.getTypeMap()
  const queryType = schema.getQueryType()
  const queryComposer = ObjectTypeComposer.createTemp(queryType)
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

function addFieldResolvers (schemaComposer, resolvers = {}) {
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
