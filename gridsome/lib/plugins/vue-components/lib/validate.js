const { parse, validate, specifiedRules } = require('graphql')

module.exports = (schema, query) => {
  return validate(schema, parse(query), specifiedRules)
}
