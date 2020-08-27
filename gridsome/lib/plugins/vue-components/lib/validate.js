const { parse, validate, specifiedRules, GraphQLError } = require('graphql')
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

const SetKnowFragment = context => {
  // Add the defined fragments in ValidationContext for rule KnowFragmentNames
  context._fragments = process.GRIDSOME.pageQuery.getFragmentsDefinitions()
  return false
}

const NoUnusedComponentFragment = context => {
  const usedFragment = process.GRIDSOME.pageQuery.usedFragments
  return {
    FragmentDefinition(node) {
      if (!usedFragment.has(node.name.value)) {
        context.reportError(new GraphQLError(`Fragment "${node.name.value}" is never used.`, node))
      }
    }
  }
}

// Remove "NoUnusedFragments" rule to replace by NoUnusedComponentFragment
const defaultRules = specifiedRules.filter(({ name }) => name !== 'NoUnusedFragments')
const rules = [FixIncorrectVariableUsage, SetKnowFragment, NoUnusedComponentFragment, ...defaultRules]

module.exports = (schema, query) => {
  return validate(schema, parse(query), rules)
}
