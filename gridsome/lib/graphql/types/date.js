const moment = require('moment')
const { fieldResolver } = require('../resolvers')
const { ISO_8601_FORMAT } = require('../../utils/constants')
const { GraphQLString, GraphQLScalarType, Kind } = require('graphql')

exports.GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  serialize: String,
  parseValue: String,
  parseLiteral (ast) {
    return ast.kind === Kind.STRING ? ast.value : undefined
  }
})

exports.isDate = value => {
  const date = moment.utc(value, ISO_8601_FORMAT, true)
  return date.isValid() && typeof value !== 'number'
}

exports.dateType = {
  type: exports.GraphQLDate,
  args: {
    format: { type: GraphQLString, description: 'Date format' },
    locale: { type: GraphQLString, description: 'Locale' }
  },
  resolve: (obj, args, context, { fieldName }) => {
    return obj[fieldName] ? formatDate(obj[fieldName], args) : null
  }
}

// TODO: remove this before v1.0
exports.dateTypeField = {
  ...exports.dateType,
  resolve: (obj, args, context, info) => {
    const value = fieldResolver(obj, args, context, info)
    return value ? formatDate(value, args) : null
  }
}

function formatDate (value, args = {}) {
  if (Object.keys(args).length) {
    const { format, locale = 'en' } = args

    return moment
      .utc(toString(value), ISO_8601_FORMAT, true)
      .locale(locale)
      .format(format)
  }

  return toString(value)
}

function toString (value) {
  return typeof value === 'number'
    ? new Date(value).toISOString()
    : typeof value === 'object'
      ? value.toISOString()
      : value
}
