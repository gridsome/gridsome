const { parse } = require('./graphql')
const { pagingFromAst } = require('./schema/directives/paginate')

module.exports = pageQuery => {
  const result = normalize(pageQuery)

  result.query = result.content ? parse(result.content) : null
  result.paginate = pagingFromAst(result.query)

  return result
}

function normalize (pageQuery) {
  return {
    query: null,
    paginate: { collection: undefined, perPage: undefined },
    content: pageQuery.content || '',
    options: pageQuery.options || {},
    type: pageQuery.type
  }
}
