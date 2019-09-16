const { safeKey } = require('../utils')
const { omit, isPlainObject } = require('lodash')
const { isRefField } = require('./utils')
const { NODE_FIELDS } = require('../utils/constants')

module.exports = function processNodeReferences (entry, node, collection) {
  const obj = omit(node, NODE_FIELDS)

  for (const fieldName in collection._refs) {
    const ref = collection._refs[fieldName]

    obj[fieldName] = {
      typeName: ref.typeName,
      id: node[fieldName]
    }
  }

  return { ...entry, belongsTo: getBelongsTo(obj) }
}

function getBelongsTo(obj, res = {}) {
  for (const key in obj) {
    const value = obj[key]

    if (!value) continue

    if (isPlainObject(value)) {
      if (isRefField(value) && value.id) {
        processValue(value, res)
      } else {
        getBelongsTo(value, res)
      }
    } else if (Array.isArray(value)) {
      const length = value.length

      for (let i = 0; i < length; i++) {
        processValue(value[i], res)
      }
    }
  }

  return res
}

function processValue(value, res = {}) {
  if (isRefField(value) && value.id) {
    if (Array.isArray(value.typeName)) {
      value.typeName.forEach(typeName => {
        createBelongsTo({ typeName, id: value.id }, res)
      })
    } else {
      createBelongsTo(value, res)
    }
  } else if (isPlainObject(value)) {
    getBelongsTo(value, res)
  }
}

function createBelongsTo({ typeName, id }, res = {}) {
  res[typeName] = res[typeName] || {}

  if (Array.isArray(id)) {
    id.forEach(id => {
      res[typeName][safeKey(id)] = true
    })
  } else if (id) {
    res[typeName][safeKey(id)] = true
  }

  return res
}
