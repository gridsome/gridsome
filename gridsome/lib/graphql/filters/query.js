const { reduce } = require('lodash')
const { InputTypeComposer } = require('graphql-compose')

function toFilterArgs (filter, filterComposer, currentKey = '') {
  const args = {}

  for (const key in filter) {
    const value = filter[key]

    if (value === undefined) continue

    const field = filterComposer.getFieldTC(key)
    const extensions = filterComposer.getFieldExtensions(key)

    if (extensions.isNodeReference) {
      // pick the id for reference inferred from store.createReference()
      args[`${currentKey}.id`] = convertFilterValues({ [key]: value })
    } else if (field instanceof InputTypeComposer) {
      const newKey = currentKey ? `${currentKey}.${key}` : key
      Object.assign(args, toFilterArgs(value, field, newKey))
    } else {
      args[currentKey] = convertFilterValues({ [key]: value })
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
