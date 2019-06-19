const directives = require('./directives')
const initMustHaveTypes = require('./types')
const createPagesSchema = require('./pages')
const createNodesSchema = require('./nodes')
const createMetaDataSchema = require('./metaData')
const { scalarTypeResolvers } = require('./resolvers')
const { addDirectives, applyFieldExtensions } = require('./extensions')

const {
  parse,
  isType,
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

const {
  SchemaComposer,
  InputTypeComposer,
  UnionTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const {
  isCreatedType,
  CreatedGraphQLType,
  addObjectTypeExtensions
} = require('./utils')

module.exports = function createSchema (store, context = {}) {
  const { types = [], schemas = [], resolvers = [] } = context
  const schemaComposer = new SchemaComposer()

  initMustHaveTypes(schemaComposer).forEach(typeComposer => {
    schemaComposer.addSchemaMustHaveType(typeComposer)
  })

  addDirectives(schemaComposer)

  directives.forEach(directive => {
    schemaComposer.addDirective(directive)
  })

  types.forEach(typeOrSDL => {
    addTypes(schemaComposer, typeOrSDL)
  })

  createNodesSchema(schemaComposer, store)
  createPagesSchema(schemaComposer)
  createMetaDataSchema(schemaComposer, store)
  processObjectTypes(schemaComposer)
  addSchemas(schemaComposer, schemas)
  addResolvers(schemaComposer, resolvers)

  return schemaComposer
}

function addTypes (schemaComposer, typeOrSDL) {
  if (typeof typeOrSDL === 'string') {
    parse(typeOrSDL).definitions.forEach(typeNode => {
      addTypeDefNode(schemaComposer, typeNode)
    })
  } else if (isCreatedType(typeOrSDL)) {
    addCreatedType(schemaComposer, typeOrSDL)
  } else if (isType(typeOrSDL)) {
    // TODO: addGraphQLType(schemaComposer, typeOrSDL)
  }
}

function addTypeDefNode (schemaComposer, typeNode) {
  const { value: typeName } = typeNode.name
  const existingTypeComposer = getTypeComposer(schemaComposer, typeName)
  const typeComposer = schemaComposer.typeMapper.makeSchemaDef(typeNode)

  addObjectTypeExtensions(typeComposer)

  if (existingTypeComposer) {
    mergeTypes(schemaComposer, existingTypeComposer, typeComposer)
  } else {
    addType(schemaComposer, typeComposer)
  }
}

function addCreatedType (schemaComposer, { type, options }) {
  const existingTypeComposer = getTypeComposer(schemaComposer, options.name)
  const typeComposer = createType(schemaComposer, type, options)

  if (existingTypeComposer) {
    mergeTypes(schemaComposer, existingTypeComposer, typeComposer)
  } else {
    addType(schemaComposer, typeComposer)
  }
}

function addType (schemaComposer, typeComposer) {
  typeComposer.setExtension('isUserDefined', true)

  validateTypeName(typeComposer)

  schemaComposer.add(typeComposer)
  schemaComposer.addSchemaMustHaveType(typeComposer)
}

const ReservedTypeNames = ['Page', 'Node', 'Image', 'File', 'Date']
const ReservedRules = {
  'FilterInput$': `Type name cannot end with 'FilterInput'.`,
  'QueryOperatorInput$': `Type name cannot end with 'QueryOperatorInput'`,
  '^MetaData[A-Z]': `Type name cannot start with 'MetaData'`,
  '^Node[A-Z]': `Type name cannot start with 'Node'`
}

function validateTypeName (typeComposer) {
  const typeName = typeComposer.getTypeName()

  if (ReservedTypeNames.includes(typeName)) {
    throw new Error(`'${typeName}' is a reserved type name.`)
  }

  for (const rule in ReservedRules) {
    if (new RegExp(rule).test(typeName)) {
      throw new Error(ReservedRules[rule])
    }
  }
}

function createType (schemaComposer, type, options) {
  switch (type) {
    case CreatedGraphQLType.Object:
      return ObjectTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Union:
      return UnionTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.InputObject:
      return InputTypeComposer.createTemp(options, schemaComposer)
  }
}

function mergeTypes (schemaComposer, existingTC, newTC) {
  existingTC.merge(newTC)
  existingTC.extendExtensions(newTC.getExtensions())
  schemaComposer.set(existingTC.getTypeName(), existingTC)
}

function processObjectTypes (schemaComposer) {
  for (const typeComposer of schemaComposer.values()) {
    if (!(typeComposer instanceof ObjectTypeComposer)) continue
    if (typeComposer === schemaComposer.Query) continue

    if (typeComposer.getExtension('isUserDefined')) {
      processObjectFields(typeComposer)
    }

    applyFieldExtensions(typeComposer)
  }
}

function processObjectFields (typeComposer) {
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
    const resolverName = isPlural ? 'referenceMany' : 'referenceOne'

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

function addSchemas (schemaComposer, schemas) {
  schemas.forEach(schema => {
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
  })
}

function addResolvers (schemaComposer, resolvers = {}) {
  resolvers.forEach(typeMap => {
    for (const typeName in typeMap) {
      const fields = typeMap[typeName]
      const typeComposer = schemaComposer.getOTC(typeName)

      for (const fieldName in fields) {
        const fieldOptions = typeof fields[fieldName] === 'function'
          ? { resolve: fields[fieldName] }
          : fields[fieldName]

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
  })
}

function getTypeComposer (schemaComposer, typeName) {
  return schemaComposer.has(typeName)
    ? schemaComposer.get(typeName)
    : null
}
