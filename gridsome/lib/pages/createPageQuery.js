const { valueFromASTUntyped } = require('graphql')
const { PER_PAGE } = require('../utils/constants')
const { isRefField } = require('../store/utils')
const { get, isUndefined } = require('lodash')

module.exports = function createPageQuery (parsed, context = {}) {
  const res = {
    source: parsed.source,
    document: parsed.document,
    paginate: null,
    variables: {},
    filters: {}
  }

  res.variables = variablesFromContext(context, parsed.variables)

  if (parsed.directives.paginate) {
    const { paginate } = parsed.directives

    res.paginate = {
      typeName: paginate.typeName,
      fieldName: paginate.fieldName,
      fieldTypeName: paginate.fieldTypeName,
      belongsToArgs: null,
      args: {}
    }

    for (const key in paginate.args) {
      res.paginate.args[key] = valueFromASTUntyped(paginate.args[key], res.variables)
    }

    if (paginate.belongsToArgs) {
      res.paginate.belongsToArgs = {}
      for (const key in paginate.belongsToArgs) {
        res.paginate.belongsToArgs[key] = valueFromASTUntyped(paginate.belongsToArgs[key], res.variables)
      }
    }

    if (!res.paginate.args.perPage) {
      res.paginate.args.perPage = PER_PAGE
    }
  }

  return res
}

function variablesFromContext (context, queryVariables = []) {
  return queryVariables.reduce((acc, { path, name, defaultValue }) => {
    let value = get(context, path, defaultValue)

    if (isUndefined(value)) {
      return acc
    }

    if (value && isRefField(value)) {
      value = value.id
    }

    acc[name] = value

    return acc
  }, {})
}
