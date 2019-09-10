const {
  Kind,
  BREAK,
  visit,
  TypeInfo,
  visitWithTypeInfo
} = require('graphql')

function fixIncorrectVariableUsage (schema, ast, variableDef) {
  const { type: innerType } = variableDef.type
  const typeNode = innerType || variableDef.type
  const { value: name } = variableDef.variable.name
  const typeInfo = new TypeInfo(schema)

  const incorrectNodes = []

  visit(ast, visitWithTypeInfo(typeInfo, {
    Argument (node) {
      if (node.value.kind === Kind.VARIABLE && node.name.value === name) {
        const inputTypeName = typeInfo.getInputType().toString()

        if (typeNode.name.value !== inputTypeName) {
          incorrectNodes.push({
            name: node.name.value,
            oldType: typeNode.name.value,
            newType: inputTypeName
          })

          typeNode.name.value = inputTypeName

          return BREAK
        }
      }
    }
  }))

  return incorrectNodes
}

module.exports = {
  fixIncorrectVariableUsage
}
