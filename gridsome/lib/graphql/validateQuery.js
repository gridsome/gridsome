const { parse, visit, validate, specifiedRules } = require('graphql')

module.exports = (schema, query) => {
  return validate(schema, parseQuery(query), specifiedRules)
}

function parseQuery (query) {
  return visit(parse(query), {
    Directive (node) {
      // remove @paginate directive from schema
      // beause mergeSchemas doesn't include it
      if (node.name.value === 'paginate') {
        return null
      }
    }
  })
}
