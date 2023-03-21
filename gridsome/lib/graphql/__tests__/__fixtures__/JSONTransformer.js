const { GraphQLString } = require('../../graphql')

class JSONTransformer {
  static mimeTypes () {
    return ['application/json']
  }

  constructor (options, { resolveNodeFilePath }) {
    this.resolveNodeFilePath = resolveNodeFilePath
  }

  parse (content) {
    return JSON.parse(content)
  }

  extendNodeType () {
    return {
      myField: {
        type: GraphQLString,
        resolve: () => 'value'
      },
      fileField: {
        type: GraphQLString,
        resolve: node => {
          return this.resolveNodeFilePath(node, '/assets/image.png')
        }
      }
    }
  }
}

module.exports = JSONTransformer
