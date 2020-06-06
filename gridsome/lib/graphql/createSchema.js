const directives = require('./directives')
const initMustHaveTypes = require('./types')
const createPagesSchema = require('./pages')
const createNodesSchema = require('./nodes')
const createMetadataSchema = require('./metadata')
const { scalarTypeResolvers } = require('./resolvers')
const { addDirectives, applyFieldExtensions } = require('./extensions')
const { isEmpty, isPlainObject, findLastIndex, get } = require('lodash')
const { isRefField } = require('../store/utils')

const {
  parse,
  isType,
  getNamedType,
  isSpecifiedScalarType,
  isIntrospectionType,
  defaultFieldResolver
} = require('graphql')

const {
  SchemaComposer,
  EnumTypeComposer,
  InputTypeComposer,
  UnionTypeComposer,
  ScalarTypeComposer,
  ObjectTypeComposer,
  InterfaceTypeComposer
} = require('graphql-compose')

const {
  isCreatedType,
  hasNodeReference,
  CreatedGraphQLType
} = require('./utils')

const {
  createReferenceOneUnionResolver,
  createReferenceManyUnionResolver
} = require('./nodes/resolvers')

module.exports = function createSchema (store, options = {}) {
  const { types = [], schemas = [], resolvers = [], extensions = [] } = options
  const schemaComposer = new SchemaComposer()

  initMustHaveTypes(schemaComposer).forEach(typeComposer => {
    schemaComposer.addSchemaMustHaveType(typeComposer)
  })

  addDirectives(schemaComposer, extensions)

  directives.forEach(directive => {
    schemaComposer.addDirective(directive)
  })

  types.forEach(typeOrSDL => {
    addTypes(schemaComposer, typeOrSDL)
  })

  createNodesSchema(schemaComposer, store)
  createMetadataSchema(schemaComposer, store)
  createPagesSchema(schemaComposer)
  addSchemas(schemaComposer, schemas)
  addResolvers(schemaComposer, resolvers)
  processTypes(schemaComposer, extensions)
  setupBelongsTo(schemaComposer, store)

  return schemaComposer
}

function setupBelongsTo (schemaComposer, store) {
  const typeNames = Object.keys(store.collections)

  for (const typeName of typeNames) {
    const collection = store.getCollection(typeName)
    const typeComposer = schemaComposer.get(typeName)
    const nodes = collection.data()
    const length = nodes.length

    const references = getNodeReferenceFields(typeComposer)
    typeComposer.setExtension('references', references)

    // TODO: move this to internal plugin
    for (let i = 0; i < length; i++) {
      const node = nodes[i]

      for (const item of references) {
        const fieldValue = get(node, item.path)

        if (!fieldValue) continue

        const values = Array.isArray(fieldValue)
          ? fieldValue
          : [fieldValue]

        values.forEach(value => {
          const id = isRefField(value) ? value.id : value

          store.setBelongsTo(node, item.typeName, id)
        })
      }
    }
  }
}

function getNodeReferenceFields (typeComposer, currentPath = []) {
  let res = []

  if (typeComposer instanceof ObjectTypeComposer) {
    const fields = typeComposer.getFields()

    for (const fieldName in fields) {
      const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
      const { directives = [] } = typeComposer.getFieldExtensions(fieldName)

      if (fieldTypeComposer instanceof ObjectTypeComposer) {
        if (fieldTypeComposer.hasInterface('Node')) {
          const typeName = fieldTypeComposer.getTypeName()
          const index = findLastIndex(directives, ['name', 'reference'])
          const path = currentPath.concat(fieldName)
          const dir = directives[index]

          // TODO: support custom fields
          if (dir && dir.args && dir.args.by === 'id') {
            res.push({ typeName, path })
          }
        } else {
          res = res.concat(
            getNodeReferenceFields(
              fieldTypeComposer,
              currentPath.concat(fieldName)
            )
          )
        }
      }
    }
  }

  return res
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

  typeComposer.getDirectives().forEach(directive => {
    typeComposer.setExtension(directive.name, directive.args)
  })

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
  typeComposer.setExtension('isCustomType', true)

  validateTypeName(typeComposer)

  schemaComposer.add(typeComposer)
  schemaComposer.addSchemaMustHaveType(typeComposer)
}

const ReservedTypeNames = ['Page', 'Node']
const ReservedScalarNames = ['Boolean', 'Date', 'File', 'Float', 'ID', 'Image', 'Int', 'JSON', 'String']
const ReservedRules = {
  'FilterInput$': `Type name cannot end with 'FilterInput'.`,
  'QueryOperatorInput$': `Type name cannot end with 'QueryOperatorInput'`,
  '^Metadata[A-Z]': `Type name cannot start with 'Metadata'`,
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

function convertExtensionsToDirectives (options) {
  if (isPlainObject(options.fields)) {
    for (const fieldName in options.fields) {
      const fieldConfig = options.fields[fieldName]
      if (isPlainObject(fieldConfig.extensions)) {
        const fieldExtensions = []
        for (const name in fieldConfig.extensions) {
          fieldExtensions.push({ name, args: fieldConfig.extensions[name] })
          delete fieldConfig.extensions[name]
        }
        fieldConfig.extensions.directives = fieldExtensions
      } else if (Array.isArray(fieldConfig.extensions)) {
        const directives = fieldConfig.extensions
        fieldConfig.extensions = { directives }
      }
    }
  }
}

function createType (schemaComposer, type, options) {
  switch (type) {
    case CreatedGraphQLType.Object: {
      convertExtensionsToDirectives(options)
      return ObjectTypeComposer.createTemp(options, schemaComposer)
    }
    case CreatedGraphQLType.Union:
      return UnionTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Input:
      return InputTypeComposer.createTemp(options, schemaComposer)

    case CreatedGraphQLType.Scalar:
      return ScalarTypeComposer.createTemp(options, schemaComposer)

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

function processTypes (schemaComposer, extensions) {
  const seen = new Set()

  for (const typeComposer of schemaComposer.values()) {
    if (typeof typeComposer.getTypeName !== 'function') continue
    else if (seen.has(typeComposer.getTypeName())) continue
    else seen.add(typeComposer.getTypeName())

    switch (typeComposer.constructor) {
      case ObjectTypeComposer:
        processObjectTypeFields(schemaComposer, typeComposer, extensions)
        break
    }
  }

  seen.clear()
}

function processObjectTypeFields (schemaComposer, typeComposer, extensions) {
  const fields = typeComposer.getFields()

  for (const fieldName in fields) {
    const fieldConfig = typeComposer.getFieldConfig(fieldName)
    const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
    const extensions = typeComposer.getFieldExtensions(fieldName)
    const typeName = fieldTypeComposer.getTypeName()

    if (
      !typeComposer.getExtension('isCustomType') ||
      // already has a custom resolver
      typeof fieldConfig.resolve === 'function' ||
      // field has custom arguments, expecting custom resolver
      !isEmpty(fieldConfig.args)
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

      if (!fieldTypeComposer.hasResolver(resolverName)) {
        throw new Error(
          `The ${typeComposer.getTypeName()}.${fieldName} field is ` +
          `referencing a node type, but no "${typeName}" collection exists. `
        )
      }

      const resolver = fieldTypeComposer.getResolver(resolverName)

      typeComposer.setField(fieldName, resolver)
    } else if (scalarTypeResolvers[typeName]) {
      typeComposer.setField(fieldName, scalarTypeResolvers[typeName])
    }

    typeComposer.setFieldExtensions(fieldName, extensions)
  }

  applyFieldExtensions(typeComposer, extensions)
}

function addSchemas (schemaComposer, schemas) {
  schemas.forEach(schema => {
    const typeMap = schema.getTypeMap()
    const queryType = schema.getQueryType()
    const mutationType = schema.getMutationType()

    if (queryType) {
      const tempTypeComposer = schemaComposer.createTempTC(queryType)
      renameRootTypeName(tempTypeComposer, queryType, 'Query')
      schemaComposer.Query.addFields(tempTypeComposer.getFields())
    }

    if (mutationType) {
      const tempTypeComposer = schemaComposer.createTempTC(mutationType)
      schemaComposer.Mutation.addFields(tempTypeComposer.getFields())
    }

    for (const typeName in typeMap) {
      const typeDef = typeMap[typeName]

      if (typeDef === queryType) continue
      if (typeDef.name === 'JSON') continue
      if (typeDef.name === 'Date') continue
      if (isIntrospectionType(typeDef)) continue
      if (isSpecifiedScalarType(typeDef)) continue

      const typeComposer = schemaComposer.createTC(typeDef)

      typeComposer.setExtension('isExternalType', true)

      if (
        typeComposer instanceof ObjectTypeComposer ||
        typeComposer instanceof InterfaceTypeComposer
      ) {
        renameRootTypeName(typeComposer, queryType, 'Query')
      }

      schemaComposer.addSchemaMustHaveType(typeComposer)
    }
  })
}

function renameRootTypeName (typeComposer, rootTypeDef, rootTypeName) {
  if (
    typeComposer instanceof ObjectTypeComposer ||
    typeComposer instanceof InterfaceTypeComposer
  ) {
    typeComposer.getFieldNames().forEach(fieldName => {
      const fieldType = typeComposer.getFieldType(fieldName)

      if (getNamedType(fieldType) === rootTypeDef) {
        typeComposer.extendField(fieldName, {
          type: fieldType.toString().replace(rootTypeDef.name, rootTypeName)
        })
      }
    })
  }
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

        if (typeof fieldOptions.resolve !== 'function') {
          throw new Error(`Resolver for ${typeName}.${fieldName} must have a "resolve" function.`)
        }

        if (typeComposer.hasField(fieldName)) {
          const fieldConfig = typeComposer.getFieldConfig(fieldName)
          const originalResolver = fieldConfig.resolve || defaultFieldResolver

          typeComposer.setField(fieldName, {
            type: fieldOptions.type || fieldConfig.type,
            args: fieldOptions.args || fieldConfig.args,
            extensions: fieldOptions.extensions || {},
            resolve: (obj, args, ctx, info) => {
              return fieldOptions.resolve(obj, args, ctx, { ...info, originalResolver })
            }
          })
        } else {
          if (!fieldOptions.type) {
            throw new Error(`Resolver for ${typeName}.${fieldName} must have a "type" property.`)
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
