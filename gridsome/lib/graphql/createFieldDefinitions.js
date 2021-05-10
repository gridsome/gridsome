const camelCase = require('camelcase')
const { warn } = require('../utils/log')
const { isRefField } = require('../store/utils')
const { isRefFieldDefinition, RefField } = require('./utils')

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
  const res = {}

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('$')) continue
    if (key.startsWith('__')) continue
    if (isNil(value)) continue

    const currentValue = currentObj[key] ? currentObj[key].value : undefined
    const currentType = Object.prototype.toString.call(currentValue)
    const resolvedValue = resolveValue(value, currentValue, options, path.concat(key))
    const resolvedType = Object.prototype.toString.call(resolvedValue)

    if (isRefFieldDefinition(currentValue) && isRefFieldDefinition(resolvedValue)) {
      currentValue.typeName.forEach((typeName) => {
        if (!resolvedValue.typeName.includes(typeName)) {
          resolvedValue.typeName.push(typeName)
        }
      })
    }

    if (!isNil(currentValue) && (resolvedType !== currentType)) {
      throw new Error(
        `Field type mismatch for ${[...path, key].join('.')}. ` +
        `Expected "${currentType}" but got "${resolvedType}". ` +
        `Please check to make sure your data sources have compatible shapes.`
      )
    }

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

  return isPlainObject(currentObj)
    ?  { ...currentObj, ...res }
    : res
}

function resolveValue (value, currentValue, options, path = []) {
  if (Array.isArray(value)) {
    const length = value.length

    if (!length) return currentValue

    if (isRefField(value[0])) {
      const typeNames = []
      let entry

      for (let i = 0; i < length; i++) {
        entry = value[i]
        if (!entry.typeName) {
          warn(`Missing typeName for reference at: ${path.join('.')}.${i}`)
        } else if (!typeNames.includes(entry.typeName)) {
          typeNames.push(entry.typeName)
        }
      }

      return new RefField(typeNames, true)
    }

    const arr = Array.isArray(currentValue) ? currentValue.slice() : new Array(length)

    for (let i = 0; i < length; i++) {
      arr[0] = resolveValue(value[i], arr[0], options, path.concat(i))
    }

    return arr.filter(v => !isNil(v))
  } else if (isRefField(value)) {
    if (!value.typeName) {
      warn(`Missing typeName for reference in field: ${path.join('.')}`)
      return currentValue
    }

    const isList = isRefFieldDefinition(currentValue)
      ? currentValue.isList
      : Array.isArray(value.id)

    return new RefField([value.typeName], isList)
  } else if (isPlainObject(value)) {
    return resolveValues(value, currentValue, options, path)
  } else if (isNumber(value)) {
    return isNumber(currentValue) && isInteger(value)
      ? currentValue
      : value
  }

  return value
}

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

function createFieldName (key, camelCased = false) {
  key = key.replace(nonValidCharsRE, '_')
  if (camelCased) key = camelCase(key)
  key = key.replace(leadingNumberRE, '_$1')

  return key
}
