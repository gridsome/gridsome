const { visit, parse, BREAK } = require('graphql')
const { trimStart, upperFirst } = require('lodash')
const { PER_PAGE, NODE_FIELDS } = require('../../utils/constants')

function parsePageQuery (pageQuery) {
  const result = {
    content: pageQuery.content || '',
    options: pageQuery.options || {},
    typeName: pageQuery.typeName,
    variables: [],
    paginate: {
      typeName: undefined,
      perPage: PER_PAGE
    }
  }

  const ast = result.content ? parse(result.content) : null

  result.query = ast && visit(ast, {
    Variable ({ name: { value: name }}) {
      if (name === 'page') return

      const path = !NODE_FIELDS.includes(name)
        ? ['fields'].concat(name.split('__'))
        : [name]

      result.variables.push({ name, path })
    },
    Field (fieldNode) {
      return visit(fieldNode, {
        Directive (node, key, parent, path, ancestors) {
          if (node.name.value === 'paginate') {
            if (result.paginate.typeName) {
              return BREAK
            }

            const parentNode = ancestors.slice().pop()
            const perPageArg = parentNode.arguments.find(node => node.name.value === 'perPage')

            // guess content type by converting root field value into a camel cased string
            result.paginate.typeName = upperFirst(trimStart(fieldNode.name.value, 'all'))

            if (perPageArg) {
              result.paginate.perPage = Number(perPageArg.value.value)
            }

            return null
          }
        }
      })
    }
  })

  return result
}

module.exports = parsePageQuery
