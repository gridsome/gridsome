const { BREAK } = require('graphql/language/visitor')

const {
  visit,
  GraphQLDirective,
  DirectiveLocation
} = require('../../graphql')

exports.PaginateDirective = new GraphQLDirective({
  name: 'paginate',
  description: 'Paginate a connection in a query. Only supported in pages.',
  locations: [
    DirectiveLocation.FIELD
  ]
})

exports.pagingFromAst = ast => {
  const result = {
    paginate: false,
    collection: undefined,
    perPage: undefined
  }

  visit(ast, {
    Field (fieldNode) {
      visit(fieldNode, {
        Argument ({ name, value }) {
          if (name.value === 'perPage') {
            result.perPage = Number(value.value)
          }
        },
        Directive ({ name }) {
          if (name.value === 'paginate') {
            result.paginate = true
            result.collection = fieldNode.name.value

            return BREAK
          }
        }
      })

      return result.paginate ? BREAK : false
    }
  })

  return result.paginate ? result : null
}
