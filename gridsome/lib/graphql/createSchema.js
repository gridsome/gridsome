const directives = require('./directives')
const initMustHaveTypes = require('./types')
const createPagesSchema = require('./pages')
const createNodesSchema = require('./nodes')
const createMetaDataSchema = require('./metaData')
const { scalarTypeResolvers } = require('./resolvers')
const { addDirectives, applyFieldExtensions } = require('./extensions')
const { isEmpty } = require('lodash')

const {
  parse,
  isType,
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

const {
  SchemaComposer,
  EnumTypeComposer,
  InputTypeComposer,
  UnionTypeComposer,
  ObjectTypeComposer,
  InterfaceTypeComposer
} = require('graphql-compose')

const {
  isCreatedType,
  hasNodeReference,
  CreatedGraphQLType,
  addObjectTypeExtensions
} = require('./utils')

const {
  createReferenceOneUnionResolver,
  createReferenceManyUnionResolver
} = require('./nodes/resolvers')

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
  createMetaDataSchema(schemaComposer, store)
  createPagesSchema(schemaComposer)
  addSchemas(schemaComposer, schemas)
  addResolvers(schemaComposer, resolvers)
  processTypes(schemaComposer)

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

const ReservedTypeNames = ['Page', 'Node']
const ReservedScalarNames = ['Boolean', 'Date', 'File', 'Float', 'ID', 'Image', 'Int', 'JSON', 'String']
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

  if (ReservedScalarNames.includes(typeName)) {
    throw new Error(`'${typeName}' is a reserved scalar type.`)
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

    case CreatedGraphQLType.Input:
      return InputTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Interface:
      return InterfaceTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Enum:
      return EnumTypeComposer.createTemp(options, schemaComposer)
  }
}

function mergeTypes (schemaComposer, typeA, typeB) {
  const typeName = typeA.getTypeName()

  typeA.merge(typeB)
  typeA.extendExtensions(typeB.getExtensions())
  schemaComposer.set(typeName, typeA)
}

function processTypes (schemaComposer) {
  for (const [typeComposer] of schemaComposer.entries()) {
    switch (typeComposer.constructor) {
      case ObjectTypeComposer:
        processFields(schemaComposer, typeComposer)
        break
    }
  }
}

function processFields (schemaComposer, typeComposer) {
  const fields = typeComposer.getFields()

  for (const fieldName in fields) {
    const fieldConfig = typeComposer.getFieldConfig(fieldName)
    const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
    const extensions = typeComposer.getFieldExtensions(fieldName)
    const typeName = fieldTypeComposer.getTypeName()

    if (
      fieldTypeComposer instanceof ObjectTypeComposer &&
      fieldTypeComposer !== typeComposer
    ) {
      processFields(schemaComposer, fieldTypeComposer)
    }

    if (
      !typeComposer.getExtension('isUserDefined') ||
      // field has custom arguments, expecting custom resolver
      !isEmpty(fieldConfig.args) ||
      // already has a custom resolver
      fieldConfig.resolve
    ) {
      continue
    }

    if (
      fieldTypeComposer instanceof UnionTypeComposer &&
      fieldTypeComposer !== typeComposer &&
      hasNodeReference(fieldTypeComposer)
    ) {
      typeComposer.extendField(fieldName, {
        resolve: typeComposer.isFieldPlural(fieldName)
          ? createReferenceManyUnionResolver(fieldTypeComposer)
          : createReferenceOneUnionResolver(fieldTypeComposer)
      })
    } else if (
      fieldTypeComposer instanceof ObjectTypeComposer &&
      fieldTypeComposer.hasInterface('Node')
    ) {
      const isPlural = typeComposer.isFieldPlural(fieldName)
      const resolverName = isPlural ? 'referenceMany' : 'referenceOne'
      const resolver = fieldTypeComposer.getResolver(resolverName)

      typeComposer.setField(fieldName, resolver)
    } else if (scalarTypeResolvers[typeName]) {
      typeComposer.setField(fieldName, scalarTypeResolvers[typeName])
    }

    typeComposer.setFieldExtensions(fieldName, extensions)
  }

  applyFieldExtensions(typeComposer)
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

          typeComposer.setField(fieldName, {
            type: fieldOptions.type || field.type,
            args: fieldOptions.args || field.args,
            resolve: fieldOptions.resolve || originalResolver
          })
        } else {
          if (!fieldOptions.type) {
            throw new Error(`${typeName}.${fieldName} must have a 'type' property.`)
          }

          typeComposer.setField(fieldName, fieldOptions)
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
