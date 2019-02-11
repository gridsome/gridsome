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
      fieldName: undefined,
      typeName: undefined,
      createFilters: () => {},
      perPage: () => PER_PAGE
    }
  }

  const ast = result.content ? parse(result.content) : null

  result.query = ast && visit(ast, {
    Variable ({ name: { value: name }}) {
      if (name === 'page') return
      if (name === 'path') return

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
            const filterArg = parentNode.arguments.find(node => node.name.value === 'filter')

            // guess content type by converting root field value into a camel cased string
            result.paginate.typeName = upperFirst(trimStart(fieldNode.name.value, 'all'))
            result.paginate.fieldName = fieldNode.name.value

            if (perPageArg) {
              result.paginate.perPage = (vars = {}) => {
                return vars.perPage || Number(perPageArg.value.value)
              }
            }

            if (filterArg) {
              result.paginate.createFilters = (vars = {}) => {
                return argToObject(filterArg.value, vars)
              }
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
    case 'Variable':
      return vars[node.name.value]
    case 'EnumValue':
    case 'BooleanValue':
    case 'StringValue':
      return node.value
  }

  return obj
}

module.exports = parsePageQuery
