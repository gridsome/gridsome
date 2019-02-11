const { get } = require('lodash')

function queryVariables (node, variables = []) {
  return variables.reduce((acc, { name, path }) => {
    let value = get(node, path) || null

    if (isRef(value)) {
      value = value.id
    }

    acc[name] = value

    return acc
  }, {})
}

function isRef (obj) {
  return (
    typeof obj === 'object' &&
    Object.keys(obj).length === 2 &&
    obj.hasOwnProperty('typeName') &&
    obj.hasOwnProperty('id')
  )
}

module.exports = queryVariables
