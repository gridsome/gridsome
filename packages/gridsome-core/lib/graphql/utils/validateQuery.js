const { validate, parse } = require('../graphql')

const {
  ValuesOfCorrectTypeRule,
  VariablesDefaultValueAllowedRule,
  FragmentsOnCompositeTypesRule,
  KnownTypeNamesRule,
  LoneAnonymousOperationRule,
  PossibleFragmentSpreadsRule,
  ScalarLeafsRule,
  VariablesAreInputTypesRule,
  VariablesInAllowedPositionRule
} = require('../graphql')

const validationRules = [
  ValuesOfCorrectTypeRule,
  VariablesDefaultValueAllowedRule,
  FragmentsOnCompositeTypesRule,
  KnownTypeNamesRule,
  LoneAnonymousOperationRule,
  PossibleFragmentSpreadsRule,
  ScalarLeafsRule,
  VariablesAreInputTypesRule,
  VariablesInAllowedPositionRule
]

module.exports = (schema, query) => {
  return validate(schema, parse(query), validationRules)
}
