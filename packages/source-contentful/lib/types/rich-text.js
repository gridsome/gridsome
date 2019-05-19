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
    const value = obj.$loki && obj.fields && obj.fields[info.fieldName]
      ? obj.fields[info.fieldName] // for gridsome < 0.6
      : obj[info.fieldName]

    const json = typeof value === 'string'
      ? JSON.parse(value)
      : null

    return args.html
      ? documentToHtmlString(json, options.richText)
      : json
  }
})
