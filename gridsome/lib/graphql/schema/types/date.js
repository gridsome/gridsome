const moment = require('moment')
const { fieldResolver } = require('../resolvers')
const { GraphQLString, GraphQLScalarType, Kind } = require('../../graphql')

const ISO_8601_FORMAT = [
  'YYYY',
  'YYYY-MM',
  'YYYY-MM-DD',
  'YYYYMMDD',

  // Local Time
  'YYYY-MM-DDTHH',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DDTHHmm',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHHmmss',
  'YYYY-MM-DDTHH:mm:ss.SSS',
  'YYYY-MM-DDTHHmmss.SSS',

  // Coordinated Universal Time (UTC)
  'YYYY-MM-DDTHHZ',
  'YYYY-MM-DDTHH:mmZ',
  'YYYY-MM-DDTHHmmZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHHmmssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DDTHHmmss.SSSZ',

  'YYYY-[W]WW',
  'YYYY[W]WW',
  'YYYY-[W]WW-E',
  'YYYY[W]WWE',
  'YYYY-DDDD',
  'YYYYDDDD'
]

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
    locale: { type: GraphQLString, description: 'Locale', defaultValue: 'en' }
  },
  resolve: (obj, args, context, { fieldName }) => {
    const { format, locale } = args
    const value = obj[fieldName]

    return moment(value).locale(locale).format(format)
  }
}

// TODO: remove this before v1.0
exports.dateTypeField = {
  ...exports.dateType,
  resolve: (obj, args, context, info) => {
    const value = fieldResolver(obj, args, context, info)
    const { format, locale } = args

    return moment(value).locale(locale).format(format)
  }
}
