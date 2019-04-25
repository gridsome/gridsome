const { isDate } = require('lodash')
const camelCase = require('camelcase')
const { resolvePath } = require('./utils')
const { isRefField } = require('../graphql/utils')
const { isResolvablePath, safeKey } = require('../utils')

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

module.exports = function processFields (fields = {}, refs = {}, options = {}) {
  const { origin = '', context, resolveAbsolute } = options
  const belongsTo = {}

  const addBelongsTo = ({ typeName, id }) => {
    belongsTo[typeName] = belongsTo[typeName] || {}
    if (Array.isArray(id)) {
      id.forEach(id => {
        belongsTo[typeName][safeKey(id)] = true
      })
    } else {
      belongsTo[typeName][safeKey(id)] = true
    }
  }

  const processField = field => {
    if (field === undefined) return field
    if (field === null) return field

    switch (typeof field) {
      case 'object':
        if (isDate(field)) {
          return field
        }
        if (isRefField(field)) {
          if (Array.isArray(field.typeName)) {
            field.typeName.forEach(typeName => {
              addBelongsTo({ typeName, id: field.id })
            })
          } else {
            addBelongsTo(field)
          }
        }
        return processFields(field)
      case 'string':
        return isResolvablePath(field)
          ? resolvePath(origin, field, { context, resolveAbsolute })
          : field
    }

    return field
  }

  const processFields = fields => {
    const res = {}

    for (const key in fields) {
      if (key.startsWith('__')) {
        // don't touch keys which starts with __ because they are
        // meant for internal use and will not be part of the schema
        res[key] = fields[key]
        continue
      }

      res[createKey(key)] = Array.isArray(fields[key])
        ? fields[key].map(value => processField(value))
        : processField(fields[key])
    }

    return res
  }

  const res = processFields(fields)

  // references add by collection.addReference()
  for (const fieldName in refs) {
    const { typeName } = refs[fieldName]
    const id = res[fieldName]

    if (id) addBelongsTo({ id, typeName })
  }

  return { fields: res, belongsTo }
}

function createKey (key) {
  key = key.replace(nonValidCharsRE, '_')
  key = camelCase(key)
  key = key.replace(leadingNumberRE, '_$1')

  return key
}
