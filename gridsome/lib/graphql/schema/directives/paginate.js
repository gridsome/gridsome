const { trimStart, upperFirst } = require('lodash')
const { BREAK } = require('graphql')

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
    fieldName: undefined,
    typeName: undefined,
    perPage: undefined
  }

  ast && visit(ast, {
    Field (fieldNode) {
      visit(fieldNode, {
        Argument ({ name, value }) {
          if (name.value === 'perPage') {
            result.perPage = Number(value.value)
          }
        },
        Directive ({ name }) {
          if (name.value === 'paginate') {
            result.fieldName = fieldNode.name.value
            result.typeName = upperFirst(trimStart(fieldNode.name.value, 'all'))

            return BREAK
          }
        }
      })

      return result.paginate ? BREAK : false
    }
  })

  return result
}
