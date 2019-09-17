const moment = require('moment')
const { Kind } = require('graphql')
const { ISO_8601_FORMAT } = require('../../utils/constants')

exports.isDate = value => {
  const date = moment.utc(value, ISO_8601_FORMAT, true)
  return date.isValid() && typeof value !== 'number'
}

exports.createDateScalar = schemaComposer => {
  return schemaComposer.createScalarTC({
    name: 'Date',
    serialize: String,
    parseValue: String,
    parseLiteral (ast) {
      return ast.kind === Kind.STRING ? ast.value : undefined
    }
  })
}

exports.dateType = {
  type: 'Date',
  args: {
    format: { type: 'String', description: 'Date format' },
    locale: { type: 'String', description: 'Locale' }
  },
  resolve: (obj, args, context, { fieldName }) => {
    return obj[fieldName] ? formatDate(obj[fieldName], args) : null
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
