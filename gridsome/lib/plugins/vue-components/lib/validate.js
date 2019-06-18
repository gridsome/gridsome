const { parse, visit, validate, specifiedRules } = require('graphql')
const { fixIncorrectVariableUsage } = require('../../../graphql/transforms')

module.exports = (schema, query) => {
  return validate(schema, parseQuery(schema, query), specifiedRules)
}

function parseQuery (schema, query) {
  const ast = parse(query)

  return visit(ast, {
    VariableDefinition (variableDef) {
      if (variableDef.variable.name.value !== 'page') {
        // TODO: remove this fix before 1.0
        fixIncorrectVariableUsage(schema, ast, variableDef)
      }
    },
    Directive (node) {
      // remove @paginate directive from schema
      // beause mergeSchemas doesn't include it
      if (node.name.value === 'paginate') {
        return null
      }
    }
  })
}
