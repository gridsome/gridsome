const { Source, findDeprecatedUsages, getLocation } = require('graphql')
const { fixIncorrectVariableUsage } = require('./transforms')
const { deprecate } = require('../utils/deprecate')

const {
  Kind,
  parse,
  visit,
  TypeInfo,
  visitWithTypeInfo,
  valueFromASTUntyped,
  GraphQLObjectType
} = require('graphql')

module.exports = function parseQuery (schema, source, resourcePath) {
  const res = {
    source,
    document: null,
    variables: [],
    directives: {}
  }

  let ast = null

  try {
    ast = parse(source)
  } catch (err) {
    return res
  }

  findDeprecatedUsages(schema, ast).forEach(err => {
    let line = 0
    let column = 0

    if (Array.isArray(err.locations) && err.locations.length) {
      [{ line, column }] = err.locations
    }

    deprecate(err.message, {
      customCaller: [resourcePath, line, column]
    })
  })

  const src = new Source(source)
  const typeInfo = new TypeInfo(schema)
  const variableDefs = []
  const typeNames = {}

  res.document = visit(ast, visitWithTypeInfo(typeInfo, {
    VariableDefinition (variableDef) {
      if (variableDef.variable.name.value !== 'page') {
        if (variableDef.variable.name.value === 'id') {
          // TODO: remove this fix before 1.0
          fixIncorrectVariableUsage(schema, ast, variableDef)
            .forEach(({ name, oldType, newType }) => {
              const { line, column } = getLocation(src, variableDef.loc.start)
              deprecate(`The $${name} variable should be of type ${newType} instead of ${oldType}.`, {
                customCaller: [resourcePath, line, column]
              })
            })
        }

        variableDefs.push(variableDef)
      }
    },
    Field (node) {
      const fieldDef = typeInfo.getFieldDef()

      if (fieldDef) {
        typeNames[node.name.value] = fieldDef.type.name
      }
    },
    Directive (node, key, parent, path, ancestors) {
      if (node.name.value !== 'paginate') return

      const parentField = ancestors.slice().pop()
      const fieldDef = typeInfo.getFieldDef()

      if (!fieldDef) {
        throw new Error(
          // the field didn't have a type, this shouldn't happen...
          `Cannot use @paginate on the '${parentField.name.value}' field.`
        )
      } else if (fieldDef.type instanceof GraphQLObjectType) {
        if (!hasInterface(fieldDef.type, 'NodeConnection')) {
          throw new Error(
            `Cannot use @paginate on the '${parentField.name.value}' field. ` +
            `The @paginate directive can only be used on connection fields ` +
            `like 'allPost' or 'belongsTo'.`
          )
        }
      }

      const paginate = {
        typeName: null,
        fieldName: null,
        belongsToArgs: null,
        fieldTypeName: fieldDef.type.name,
        args: {}
      }

      // TODO: can probably do this while generating render queue instead
      if (fieldDef.name === 'belongsTo') {
        const nodeType = typeInfo.getParentType()
        const nodeTypeField = ancestors.find(node => node.kind === Kind.FIELD)

        paginate.typeName = nodeType.name
        paginate.fieldName = nodeTypeField.name.value
        paginate.belongsToArgs = {}

        for (const node of parentField.arguments) {
          paginate.args[node.name.value] = node.value
        }

        for (const node of nodeTypeField.arguments) {
          paginate.belongsToArgs[node.name.value] = node.value
        }
      } else {
        const nodeType = fieldDef.type.getFields().edges.type.ofType.getFields().node.type

        paginate.typeName = nodeType.name
        paginate.fieldName = parentField.name.value

        for (const node of parentField.arguments) {
          paginate.args[node.name.value] = node.value
        }
      }

      res.directives.paginate = paginate
    }
  }))

  res.variables = variableDefs.map(node => {
    const { name: { value: name }} = node.variable

    return {
      name,
      path: name.split('__'),
      defaultValue: node.defaultValue
        ? valueFromASTUntyped(node.defaultValue)
        : undefined
    }
  })

  return res
}

function hasInterface (typeDef, interfaceName) {
  return (
    typeDef instanceof GraphQLObjectType &&
    typeDef.getInterfaces().some(({ name }) => name === interfaceName)
  )
}
