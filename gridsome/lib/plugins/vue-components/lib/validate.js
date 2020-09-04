const { parse, validate, specifiedRules, GraphQLError } = require('graphql')
const { unusedFragMessage } = require('graphql/validation/rules/NoUnusedFragments')
const { duplicateFragmentNameMessage } = require('graphql/validation/rules/UniqueFragmentNames')
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
  const pageQuery = process.GRIDSOME.pageQuery
  context._fragments = pageQuery.getFragmentsDefinitions()
  // Ensure unused fragments are detected when modify other components
  // (especially for the deletion of the spread)
  pageQuery.fragments.find({ use: { '$size': 0 } }).forEach(({ fragment }) => {
    context.reportError(new GraphQLError(unusedFragMessage(fragment.name.value), fragment))
  })
  return false
}

const NoUnusedComponentFragment = context => {
  const { fragments } = process.GRIDSOME.pageQuery
  return {
    FragmentDefinition(node) {
      const fragment = fragments.findOne({ name: node.name.value })
      if (fragment && fragment.use.length < 1) {
        context.reportError(new GraphQLError(unusedFragMessage(node.name.value), node))
      }
    }
  }
}

const UniqueComponentFragmentNames = (context) => {
  const { fragments } = process.GRIDSOME.pageQuery
  return {
    FragmentDefinition (node) {
      const fragment = fragments.by('name', node.name.value)
      if (typeof fragment !== 'undefined' && fragment.define.length > 1) {
        context.reportError(new GraphQLError(duplicateFragmentNameMessage(node.name.value), node))
      }
    }
  }
}

// Remove "NoUnusedFragments" rule to replace by NoUnusedComponentFragment
const defaultRules = specifiedRules.filter(({ name }) => name !== 'NoUnusedFragments')
const rules = [FixIncorrectVariableUsage, SetKnowFragment, NoUnusedComponentFragment, UniqueComponentFragmentNames, ...defaultRules]

module.exports = (schema, query) => {
  return validate(schema, parse(query), rules)
}
