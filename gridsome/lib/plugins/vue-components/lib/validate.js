const { parse, validate, specifiedRules } = require('graphql')
const { fixIncorrectVariableUsage } = require('../../../graphql/transforms')

const FixIncorrectVariableUsage = context => {
  const schema = context.getSchema()
  const ast = context.getDocument()

  return {
    VariableDefinition (variableDef) {
      if (variableDef.variable.name.value === 'id') {
        // TODO: remove this fix before 1.0
        fixIncorrectVariableUsage(schema, ast, variableDef)
      }
    }
  }
}

const rules = [FixIncorrectVariableUsage, ...specifiedRules]

module.exports = (schema, query) => {
  return validate(schema, parse(query), rules)
}
