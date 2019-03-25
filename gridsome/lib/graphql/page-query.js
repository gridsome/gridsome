const { visit, parse, BREAK } = require('graphql')
const { get, trimStart, upperFirst } = require('lodash')
const { PER_PAGE, NODE_FIELDS } = require('../utils/constants')
const { isRefField } = require('./utils')

function parsePageQuery (query, context) {
  const result = {
    source: null,
    document: null,
    paginate: null,
    context: {},
    filters: {}
  }

  let ast = null
  let perPage = null
  let filters = null
  const variables = []

  try {
    ast = parse(query)
  } catch (err) {
    return result
  }

  result.source = query

  result.document = visit(ast, {
    Variable ({ name: { value: name }}) {
      if (name === 'page') return
      if (name === 'path') return

      const path = name.split('__')

      variables.push({ name, path })
    },
    Field (fieldNode) {
      return visit(fieldNode, {
        Directive (node, key, parent, path, ancestors) {
          if (node.name.value === 'paginate') {
            if (result.paginate) {
              return BREAK
            }

            const parentNode = ancestors.slice().pop()
            const perPageArg = parentNode.arguments.find(node => node.name.value === 'perPage')
            const filterArg = parentNode.arguments.find(node => node.name.value === 'filter')

            result.paginate = {
              // guess content type by converting root field value into a camel cased string
              typeName: upperFirst(trimStart(fieldNode.name.value, 'all')),
              perPage: perPageArg && perPageArg.value.value ? Number(perPageArg.value.value) : PER_PAGE,
              belongsTo: parentNode.name.value === 'belongsTo',
              fieldName: fieldNode.name.value
            }

            if (perPageArg) perPage = perPageArg.value
            if (filterArg) filters = filterArg.value

            return null
          }
        }
      })
    }
  })

  result.context = context ? createQueryContext(context, variables) : {}
  result.filters = filters ? nodeToObject(filters, result.context) : {}

  if (result.paginate && perPage) {
    result.paginate.perPage = nodeToObject(perPage, result.context) || PER_PAGE
  }

  return result
}

function createQueryContext (context, variables = []) {
  return variables.reduce((acc, { name, path }) => {
    // check for $loki to get variables in node fields
    const getPath = context.$loki && !NODE_FIELDS.includes(path[0])
      ? ['fields', ...path]
      : path

    let value = get(context, getPath) || null

    if (value && isRefField(value)) {
      value = value.id
    }

    acc[name] = value

    return acc
  }, {})
}

function nodeToObject (node, vars = {}) {
  const obj = {}

  switch (node.kind) {
    case 'Argument':
      obj[node.name.value] = nodeToObject(node.value, vars)
      break
    case 'ObjectValue':
      return node.fields.reduce((acc, fieldNode) => {
        acc[fieldNode.name.value] = nodeToObject(fieldNode.value, vars)
        return acc
      }, {})
    case 'ListValue':
      return node.values.map(node => nodeToObject(node, vars))
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
