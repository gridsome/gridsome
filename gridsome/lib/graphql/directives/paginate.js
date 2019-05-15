const { GraphQLDirective, DirectiveLocation } = require('graphql')

exports.PaginateDirective = new GraphQLDirective({
  name: 'paginate',
  description: 'Paginate a connection in a query. Only supported in page-query.',
  locations: [
    DirectiveLocation.FIELD
  ]
})
