const {
  Kind,
  parse,
  visit,
  TypeInfo,
  visitWithTypeInfo,
  valueFromASTUntyped,
  GraphQLObjectType
} = require('graphql')

module.exports = function parseQuery (schema, source) {
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

  const typeInfo = new TypeInfo(schema)
  const typeNames = {}

  res.document = visit(ast, visitWithTypeInfo(typeInfo, {
    VariableDefinition (node) {
      const { name: { value: name }} = node.variable
      const defaultValue = node.defaultValue
        ? valueFromASTUntyped(node.defaultValue)
        : null

      if (name === 'page') return

      res.variables.push({ name, defaultValue, path: name.split('__') })
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
        const interfaces = fieldDef.type.getInterfaces()

        if (!interfaces.some(({ name }) => name === 'NodeConnection')) {
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

      return null
    }
  }))

  return res
}
