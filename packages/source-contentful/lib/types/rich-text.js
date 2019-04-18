const { fieldResolver } = require('gridsome/lib/graphql/resolvers')
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer')
const { GraphQLScalarType, GraphQLBoolean } = require('gridsome/graphql')

const ContentfulRichTextField = new GraphQLScalarType({
  name: 'ContentfulRichTextField',
  serialize: value => value
})

module.exports = options => ({
  type: ContentfulRichTextField,
  args: {
    html: { type: GraphQLBoolean, defaultValue: false }
  },
  resolve (obj, args, context, info) {
    const value = fieldResolver(obj, args, context, info)

    return args.html
      ? documentToHtmlString(value, options.richText)
      : value
  }
})
