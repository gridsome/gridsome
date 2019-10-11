const { reduce, mapKeys } = require('lodash')
const { InputTypeComposer, ThunkComposer } = require('graphql-compose')

const listRefOpsMap = {
  '$in': '$refListIn',
  '$nin': '$refListNin',
  '$eq': '$refListEq',
  '$ne': '$refListNe'
}

const refOpsMap = {
  '$in': '$refIn',
  '$nin': '$refNin',
  '$eq': '$refEq',
  '$ne': '$refNe'
}

function toFilterArgs (filter, typeComposer, currentKey = '') {
  const args = {}

  if (typeComposer instanceof ThunkComposer) {
    typeComposer = typeComposer.getUnwrappedTC()
  }

  for (let key in filter) {
    let value = filter[key]

    if (value === undefined) continue

    const field = typeComposer.getFieldTC(key)
    const extensions = typeComposer.getFieldExtensions(key)

    // TODO: remove this workaround
    if (extensions.isDeprecatedNodeReference) {
      currentKey += '.id'
    }

    if (field instanceof InputTypeComposer) {
      if (extensions.proxy) {
        key = extensions.proxy.from || key
      }

      const suffix = extensions.isReference ? '' : `.${key}`
      const newKey = currentKey ? `${currentKey}${suffix}` : key
      const newArgs = toFilterArgs(value, field, newKey)

      if (extensions.isReference) {
        const opsMap = extensions.isPlural ? listRefOpsMap : refOpsMap
        newArgs[newKey] = mapKeys(newArgs[newKey], (value, key) => opsMap[key])
      }

      Object.assign(args, newArgs)
    } else {
      args[currentKey] = convertFilterValues({ [key]: value }, extensions)
    }
  }

  return args
}

function convertFilterValues (value) {
  return reduce(value, (acc, value, key) => {
    const filterKey = `$${key}`

    if (key === 'regex') acc[filterKey] = new RegExp(value)
    else acc[filterKey] = value

    return acc
  }, {})
}

module.exports = {
  toFilterArgs
}
