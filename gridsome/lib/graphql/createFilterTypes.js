const { isDate } = require('./types/date')
const { isEmpty, reduce } = require('lodash')
const { is32BitInt, isRefFieldDefinition, createTypeName } = require('./utils')

const OBJ_SUFFIX = '__Object'
const REF_SUFFIX = '__Reference'

function createFilterTypes (schemaComposer, fields, typeName) {
  const types = {}

  for (const key in fields) {
    const type = createFilterType(schemaComposer, fields[key], key, typeName)

    if (type) {
      types[key] = { type }
    }
  }

  return types
}

function createFilterType (schemaComposer, value, fieldName, typeName) {
  const defaultDescription = `Filter ${typeName} nodes by ${fieldName}`

  if (isRefFieldDefinition(value)) {
    return schemaComposer.createInputTC({
      name: createFilterName(typeName, fieldName) + REF_SUFFIX,
      description: defaultDescription,
      fields: value.isList
        ? {
          size: { type: 'Int', description: desc.size },
          contains: { type: '[String]', description: desc.contains },
          containsAny: { type: '[String]', description: desc.containsAny },
          containsNone: { type: '[String]', description: desc.containsNone }
        }
        : {
          eq: { type: 'String', description: desc.eq },
          ne: { type: 'String', description: desc.ne },
          regex: { type: 'String', description: desc.regex },
          in: { type: '[String]', description: desc.in },
          nin: { type: '[String]', description: desc.nin }
        }
    })
  }

  if (isDate(value)) {
    return schemaComposer.createInputTC({
      name: createFilterName(typeName, fieldName),
      description: defaultDescription,
      fields: {
        dteq: { type: 'String', description: desc.dteq },
        gt: { type: 'String', description: desc.gt },
        gte: { type: 'String', description: desc.gte },
        lt: { type: 'String', description: desc.lt },
        lte: { type: 'String', description: desc.lte },
        between: { type: '[String]', description: desc.between }
      }
    })
  }

  if (Array.isArray(value)) {
    const valueType = toGraphQLType(value[0])

    return valueType ? schemaComposer.createInputTC({
      name: createFilterName(typeName, fieldName),
      description: defaultDescription,
      fields: {
        size: { type: 'Int', description: desc.size },
        contains: { type: [valueType], description: desc.contains },
        containsAny: { type: [valueType], description: desc.containsAny },
        containsNone: { type: [valueType], description: desc.containsNone }
      }
    }) : null
  }

  switch (typeof value) {
    case 'string' :
      return schemaComposer.createInputTC({
        name: createFilterName(typeName, fieldName),
        description: defaultDescription,
        fields: {
          len: { type: 'Int', description: desc.len },
          eq: { type: 'String', description: desc.eq },
          ne: { type: 'String', description: desc.ne },
          regex: { type: 'String', description: desc.regex },
          in: { type: '[String]', description: desc.in },
          nin: { type: '[String]', description: desc.nin }
        }
      })

    case 'boolean' :
      return schemaComposer.createInputTC({
        name: createFilterName(typeName, fieldName),
        fields: {
          eq: { type: 'Boolean', description: desc.eq },
          ne: { type: 'Boolean', description: desc.ne },
          in: { type: '[Boolean]', description: desc.in },
          nin: { type: '[Boolean]', description: desc.nin }
        }
      })

    case 'number':
      const numberType = toGraphQLType(value)

      return schemaComposer.createInputTC({
        name: createFilterName(typeName, fieldName),
        description: defaultDescription,
        fields: {
          eq: { type: numberType, description: desc.eq },
          ne: { type: numberType, description: desc.ne },
          gt: { type: numberType, description: desc.gt },
          gte: { type: numberType, description: desc.gte },
          lt: { type: numberType, description: desc.lt },
          lte: { type: numberType, description: desc.lte },
          in: { type: [numberType], description: desc.in },
          nin: { type: [numberType], description: desc.nin },
          between: { type: [numberType], description: desc.between }
        }
      })

    case 'object':
      return createObjectFilter(schemaComposer, value, fieldName, typeName)
  }
}

function createObjectFilter (schemaComposer, obj, fieldName, typeName) {
  const name = createFilterName(typeName, fieldName) + OBJ_SUFFIX
  const fields = {}

  for (const key in obj) {
    const type = createFilterType(schemaComposer, obj[key], `${fieldName} ${key}`, typeName)

    if (type) {
      fields[key] = { type }
    }
  }

  return !isEmpty(fields)
    ? schemaComposer.createInputTC({ name, fields })
    : null
}

function createFilterName (typeName, key) {
  return createTypeName(typeName, key, 'Filter')
}

function toGraphQLType (value) {
  const type = typeof value

  switch (type) {
    case 'string' : return 'String'
    case 'boolean' : return 'Boolean'
    case 'number' : return is32BitInt(value) ? 'Int' : 'Float'
  }
}

function createFilterQuery (filter, fields) {
  return Object.assign({}, toFilterArgs(filter, fields))
}

function toFilterArgs (filter, fields, current = '') {
  const result = {}

  for (const key in filter) {
    const newKey = current ? `${current}.${key}` : key
    const value = filter[key]

    if (value === undefined) continue

    if (fields[key].type.name.endsWith(OBJ_SUFFIX)) {
      Object.assign(result, toFilterArgs(value, fields[key].type.getFields(), newKey))
    } else if (fields[key].type.name.endsWith(REF_SUFFIX)) {
      result[`${newKey}.id`] = convertFilterValues(value)
    } else {
      result[newKey] = convertFilterValues(value)
    }
  }

  return result
}

function convertFilterValues (value) {
  return reduce(value, (acc, value, key) => {
    const filterKey = `$${key}`

    if (key === 'regex') acc[filterKey] = new RegExp(value)
    else acc[filterKey] = value

    return acc
  }, {})
}

const desc = {
  eq: 'Filter nodes by property of (strict) equality.',
  ne: 'Filter nodes by property not equal to provided value.',
  dteq: 'Filter nodes by date property equal to provided date value.',
  gt: 'Filter nodes by property greater than provided value.',
  gte: 'Filter nodes by property greater or equal to provided value.',
  lt: 'Filter nodes by property less than provided value.',
  lte: 'Filter nodes by property less than or equal to provided value.',
  between: 'Filter nodes by property between provided values.',
  regex: 'Filter nodes by property matching provided regular expression.',
  in: 'Filter nodes by property matching any of the provided values.',
  nin: 'Filter nodes by property not matching any of the provided values.',
  contains: 'Filter nodes by property containing the provided value.',
  containsAny: 'Filter nodes by property containing any of the provided values.',
  containsNone: 'Filter nodes by property containing none of the provided values.',
  size: 'Filter nodes which have an array property of specified size.',
  len: 'Filter nodes which have a string property of specified length.'
}

module.exports = {
  createFilterTypes,
  createFilterQuery
}
