const camelCase = require('camelcase')
const { warn } = require('../utils/log')
const { isRefField } = require('../store/utils')
const { isRefFieldDefinition } = require('./utils')

const {
  omit,
  isNil,
  isEmpty,
  isNumber,
  isInteger,
  isPlainObject
} = require('lodash')

module.exports = function createFieldDefinitions (nodes, options = {}) {
  let res = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    const fields = omit(nodes[i], ['internal'])
    res = resolveValues(fields, res, options)
  }

  return res
}

function resolveValues (obj, currentObj = {}, options = {}, path = []) {
  const res = { ...currentObj }

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('$')) continue
    if (key.startsWith('__')) continue
    if (isNil(value)) continue

    const currentValue = currentObj[key] ? currentObj[key].value : undefined
    const resolvedValue = resolveValue(value, currentValue, options, path.concat(key))

    if (
      isNil(resolvedValue) ||
      (Array.isArray(resolvedValue) && !resolvedValue.length) ||
      (isPlainObject(resolvedValue) && isEmpty(resolvedValue))
    ) {
      continue
    }

    const fieldName = createFieldName(key, options.camelCase)
    const extensions = { isInferred: true, directives: [] }

    if (fieldName !== key) {
      extensions.directives.push({ name: 'proxy', args: { from: key } })
    }

    res[key] = {
      key,
      fieldName,
      extensions,
      value: resolvedValue
    }
  }

  return res
}

function resolveValue (value, currentValue, options, path = []) {
  if (Array.isArray(value)) {
    const arr = Array.isArray(currentValue) ? currentValue : []
    const length = value.length

    if (isRefField(value[0])) {
      if (!isRefFieldDefinition(currentValue)) {
        currentValue = { typeName: [], isList: true }
      }

      for (let i = 0; i < length; i++) {
        if (!value[i].typeName) {
          warn(`Missing typeName for reference at: ${path.join('.')}.${i}`)
        } else if (!currentValue.typeName.includes(value[i].typeName)) {
          currentValue.typeName.push(value[i].typeName)
        }
      }

      return currentValue
    }

    if (isRefFieldDefinition(currentValue)) {
      return currentValue
    }

    for (let i = 0; i < length; i++) {
      arr[0] = resolveValue(value[i], arr[0], options, path.concat(i))
    }

    return arr.filter(v => !isNil(v))
  } else if (isPlainObject(value)) {
    if (isRefField(value)) {
      if (!value.typeName) {
        warn(`Missing typeName for reference in field: ${path.join('.')}`)
        return currentValue
      }

      if (currentValue) {
        if (Array.isArray(currentValue.typeName)) {
          if (!currentValue.typeName.includes(value.typeName)) {
            currentValue.typeName.push(value.typeName)
          }
        } else if (currentValue.typeName !== value.typeName) {
          // convert to union field if it has multiple typeNames
          currentValue.typeName = [currentValue.typeName, value.typeName]
        }
      }

      const ref = currentValue || { typeName: value.typeName }
      ref.isList = ref.isList || Array.isArray(value.id)

      return ref
    }

    return resolveValues(value, currentValue, options, path)
  } else if (isNumber(value)) {
    return isNumber(currentValue) && isInteger(value)
      ? currentValue
      : value
  }

  return isNil(currentValue) ? value : currentValue
}

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

function createFieldName (key, camelCased = false) {
  key = key.replace(nonValidCharsRE, '_')
  if (camelCased) key = camelCase(key)
  key = key.replace(leadingNumberRE, '_$1')

  return key
}
