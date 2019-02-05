const { visit, parse, BREAK } = require('graphql')
const { trimStart, upperFirst } = require('lodash')
const { PER_PAGE } = require('../../utils/constants')

function parsePageQuery (pageQuery) {
  const result = {
    content: pageQuery.content || '',
    options: pageQuery.options || {},
    typeName: pageQuery.typeName,
    paginate: {
      fieldName: undefined,
      typeName: undefined,
      filter: undefined,
      perPage: PER_PAGE
    }
  }

  const ast = result.content ? parse(result.content) : null

  result.query = ast && visit(ast, {
    Field (fieldNode) {
      return visit(fieldNode, {
        Directive (node, key, parent, path, ancestors) {
          if (node.name.value === 'paginate') {
            if (result.paginate.typeName) {
              return BREAK
            }

            const parentNode = ancestors.slice().pop()
            const perPageArg = parentNode.arguments.find(node => node.name.value === 'perPage')
            const filterArg = parentNode.arguments.find(node => node.name.value === 'filter')

            // guess content type by converting root field value into a camel cased string
            result.paginate.typeName = upperFirst(trimStart(fieldNode.name.value, 'all'))
            result.paginate.fieldName = fieldNode.name.value

            if (perPageArg) {
              result.paginate.perPage = Number(perPageArg.value.value)
            }

            if (filterArg) {
              result.paginate.filter = argToObject(filterArg.value)
            }

            return null
          }
        }
      })
    }
  })

  return result
}

function argToObject (node, vars = {}) {
  const obj = {}

  switch (node.kind) {
    case 'Argument':
      obj[node.name.value] = argToObject(node.value, vars)
      break
    case 'ObjectValue':
      return node.fields.reduce((acc, fieldNode) => {
        acc[fieldNode.name.value] = argToObject(fieldNode.value, vars)
        return acc
      }, {})
    case 'ListValue':
      return node.values.map(node => argToObject(node, vars))
    case 'IntValue':
      return parseInt(node.value, 10)
    case 'FloatValue':
      return parseFloat(node.value)
    case 'NullValue':
      return null
    case 'BooleanValue':
    case 'StringValue':
      return node.value
    case 'Variable':
      return vars[node.name.value]
  }

  return obj
}

module.exports = parsePageQuery
