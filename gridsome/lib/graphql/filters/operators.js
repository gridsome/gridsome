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

const defaultOperators = ['eq', 'ne', 'in', 'nin']

const scalarOperators = {
  ID: ['eq', 'ne', 'in', 'nin'],
  Enum: ['eq', 'ne', 'in', 'nin'],
  Boolean: ['eq', 'ne', 'in', 'nin'],
  JSON: ['eq', 'ne', 'in', 'nin', 'regex'],
  File: ['eq', 'ne', 'in', 'nin', 'regex'],
  Image: ['eq', 'ne', 'in', 'nin', 'regex'],
  String: ['eq', 'ne', 'in', 'nin', 'regex'],
  Int: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'between'],
  Float: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'between'],
  Date: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'dteq', 'between']
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
