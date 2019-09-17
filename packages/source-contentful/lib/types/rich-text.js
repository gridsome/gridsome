const { documentToHtmlString } = require('@contentful/rich-text-html-renderer')
const { GraphQLScalarType } = require('gridsome/graphql')

const ContentfulRichTextField = new GraphQLScalarType({
  name: 'ContentfulRichTextField',
  serialize: value => value
})

module.exports = options => ({
  type: ContentfulRichTextField,
  args: {
    html: { type: 'Boolean', defaultValue: false }
  },
  resolve (obj, args, context, info) {
    const value = obj[info.fieldName]

    const json = typeof value === 'string'
      ? JSON.parse(value)
      : null

    return args.html
      ? documentToHtmlString(json, options.richText)
      : json
  }
})
