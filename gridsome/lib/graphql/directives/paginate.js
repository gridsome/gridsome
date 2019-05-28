const { GraphQLDirective, DirectiveLocation } = require('graphql')

module.exports = new GraphQLDirective({
  name: 'paginate',
  description: 'Paginate a connection in a query. Only supported in page-query.',
  locations: [
    DirectiveLocation.FIELD
  ]
})
