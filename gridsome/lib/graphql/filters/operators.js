const allOperators = {
  eq: {
    description: 'Filter by property of (strict) equality.'
  },
  ne: {
    description: 'Filter by property not equal to provided value.'
  },
  dteq: {
    description: 'Filter by date property equal to provided date value.'
  },
  gt: {
    description: 'Filter by property greater than provided value.'
  },
  gte: {
    description: 'Filter by property greater or equal to provided value.'
  },
  lt: {
    description: 'Filter by property less than provided value.'
  },
  lte: {
    description: 'Filter by property less than or equal to provided value.'
  },
  between: {
    description: 'Filter by property between provided values.'
  },
  regex: {
    type: 'String',
    description: 'Filter by property matching provided regular expression.'
  },
  in: {
    description: 'Filter by property matching any of the provided values.'
  },
  nin: {
    description: 'Filter by property not matching any of the provided values.'
  },
  contains: {
    description: 'Filter by property containing the provided value.'
  },
  containsAny: {
    description: 'Filter by property containing any of the provided values.'
  },
  containsNone: {
    description: 'Filter by property containing none of the provided values.'
  },
  size: {
    type: 'Int',
    description: 'Filter which have an array property of specified size.'
  },
  len: {
    description: 'Filter which have a string property of specified length.'
  },
  exists: {
    type: 'Boolean',
    description: 'Filter nodes that contain the field, including nodes where the field value is null.'
  }
}

const listOperators = [
  'size',
  'contains',
  'containsAny',
  'containsNone'
]

const listFields = [
  'in',
  'nin',
  'between',
  'contains',
  'containsAny',
  'containsNone'
]

const defaultOperators = ['eq', 'ne', 'in', 'nin', 'exists']

const scalarOperators = {
  ID: defaultOperators,
  Enum: defaultOperators,
  Boolean: defaultOperators,
  JSON: [...defaultOperators, 'regex'],
  File: [...defaultOperators, 'regex'],
  Image: [...defaultOperators, 'regex'],
  String: [...defaultOperators, 'regex'],
  Int: [...defaultOperators, 'gt', 'gte', 'lt', 'lte', 'between'],
  Float: [...defaultOperators, 'gt', 'gte', 'lt', 'lte', 'between'],
  Date: [...defaultOperators, 'gt', 'gte', 'lt', 'lte', 'dteq', 'between']
}

exports.defaultOperators = defaultOperators
exports.scalarOperators = scalarOperators
exports.listOperators = listOperators

exports.toOperatorConfig = function (operators, typeName, extraExtensions, deprecationReason) {
  return operators.reduce((fields, name) => {
    const { type = typeName, description, extensions } = allOperators[name]

    fields[name] = {
      type: listFields.includes(name) ? [type] : type,
      extensions: { ...extensions, ...extraExtensions },
      description: deprecationReason || description,
      deprecationReason
    }

    return fields
  }, {})
}
