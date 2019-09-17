const { reduce } = require('lodash')

const {
  InputTypeComposer,
  ThunkComposer
} = require('graphql-compose')

function toFilterArgs (filter, typeComposer, currentKey = '') {
  const args = {}

  if (typeComposer instanceof ThunkComposer) {
    typeComposer = typeComposer.getUnwrappedTC()
  }

  for (let key in filter) {
    const value = filter[key]

    if (value === undefined) continue

    const field = typeComposer.getFieldTC(key)
    const extensions = typeComposer.getFieldExtensions(key)

    if (extensions.proxy) {
      key = extensions.proxy.from || key
    }

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
