const { parse, validate, specifiedRules } = require('graphql')

module.exports = (schema, doc, rules = specifiedRules) => {
  if (typeof doc === 'string') {
    doc = parse(doc)
  }
  return validate(schema, doc, rules)
}
