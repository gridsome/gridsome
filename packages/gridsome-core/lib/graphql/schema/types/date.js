const moment = require('moment')
const { GraphQLString, GraphQLScalarType, Kind } = require('../../graphql')

// TODO: improve this

const GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  serialize: String,
  parseValue: String,
  parseLiteral (ast) {
    return ast.kind === Kind.STRING ? ast.value : undefined
  }
})

exports.isDate = value => {
  return !!Date.parse(value)
}

exports.dateType = {
  type: GraphQLDate,
  args: {
    format: { type: GraphQLString, description: 'Date format' },
    locale: { type: GraphQLString, description: 'Locale', defaultValue: 'en' }
  },
  resolve: (fields, { format, locale }, context, { fieldName }) => {
    return moment(fields[fieldName]).locale(locale).format(format)
  }
}

