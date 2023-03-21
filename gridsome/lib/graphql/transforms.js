const {
  Kind,
  BREAK,
  visit,
  TypeInfo,
  typeFromAST,
  getNullableType,
  visitWithTypeInfo
} = require('graphql')

const getNamedAstType = node => {
  if (node && node.kind !== Kind.NAMED_TYPE) {
    return getNamedAstType(node.type)
  }

  return node
}

function fixIncorrectVariableUsage (schema, ast, variableDef) {
  const variableType = typeFromAST(schema, variableDef.type)
  const nullableType = getNullableType(variableType)
  const { value: name } = variableDef.variable.name
  const typeNode = getNamedAstType(variableDef)
  const nodeInterfaceType = schema.getType('Node')
  const typeInfo = new TypeInfo(schema)

  const incorrectNodes = []

  if (!typeNode) {
    return incorrectNodes
  }

  // TODO: remove this in 0.8
  visit(ast, visitWithTypeInfo(typeInfo, {
    Argument (node) {
      if (
        node.value.kind === Kind.VARIABLE &&
        node.name.value === name
      ) {
        const input = typeInfo.getInputType()
        const type = typeInfo.getType()

        if (input && type) {
          if (!schema.isPossibleType(nodeInterfaceType, type)) {
            return
          }

          const typeName = input.toString()
          const oldTypeName = nullableType.toString()

          if (oldTypeName !== typeName) {
            incorrectNodes.push({
              name: node.name.value,
              oldType: oldTypeName,
              newType: typeName
            })

            typeNode.name.value = typeName

            return BREAK
          }
        }
      }
    }
  }))

  return incorrectNodes
}

module.exports = {
  fixIncorrectVariableUsage
}
