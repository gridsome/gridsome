const { isRefField } = require('../graphql/utils')
const { PER_PAGE, NODE_FIELDS } = require('../utils/constants')
const { memoize, get, trimStart, upperFirst } = require('lodash')
const { visit, parse, BREAK, valueFromASTUntyped } = require('graphql')

const memoized = memoize(parsePageQuery)

function createPageQuery (source, context = null) {
  const result = memoized(source)

  const variables = context ? variablesFromContext(context, result.variables) : {}
  const filters = result.filtersAST ? valueFromASTUntyped(result.filtersAST, variables) : {}
  const paginate = result.paginate ? { ...result.paginate } : null

  if (paginate && result.perPageAST) {
    paginate.perPage = valueFromASTUntyped(result.perPageAST, variables) || PER_PAGE
  }

  if (paginate && result.paginate.belongsTo) {
    paginate.belongsTo = { id: undefined, path: undefined }

    if (result.idAST) {
      paginate.belongsTo.id = valueFromASTUntyped(result.idAST, variables)
    }

    if (result.pathAST) {
      paginate.belongsTo.path = valueFromASTUntyped(result.pathAST, variables)
    }
  }

  return {
    source: result.source,
    document: result.document,
    paginate,
    variables,
    filters
  }
}

function parsePageQuery (source) {
  const result = {
    source: null,
    document: null,
    paginate: null,
    perPageAST: null,
    filtersAST: null,
    pathAST: null,
    idAST: null,
    variables: []
  }

  let ast = null

  try {
    ast = parse(source)
  } catch (err) {
    return result
  }

  result.source = source

  result.document = visit(ast, {
    VariableDefinition (node) {
      const { name: { value: name }} = node.variable
      const defaultValue = node.defaultValue
        ? valueFromASTUntyped(node.defaultValue)
        : null

      if (name === 'page') return

      result.variables.push({ name, defaultValue, path: name.split('__') })
    },
    Field (fieldNode) {
      return visit(fieldNode, {
        Directive (node, key, parent, path, ancestors) {
          if (node.name.value === 'paginate') {
            if (result.paginate) {
              return BREAK
            }

            const { name: fieldName, arguments: args } = fieldNode
            const { name: parentName, arguments: parentArgs } = ancestors.slice().pop()

            const perPageArg = parentArgs.find(node => node.name.value === 'perPage')
            const filterArg = parentArgs.find(node => node.name.value === 'filter')

            result.paginate = {
              // guess content type by converting root field value into a camel cased string
              typeName: upperFirst(trimStart(fieldName.value, 'all')),
              perPage: perPageArg && perPageArg.value.value ? Number(perPageArg.value.value) : PER_PAGE,
              fieldName: fieldName.value,
              belongsTo: null
            }

            if (perPageArg) result.perPageAST = perPageArg.value
            if (filterArg) result.filtersAST = filterArg.value

            if (parentName.value === 'belongsTo') {
              const idArg = args.find(({ name }) => name.value === 'id')
              const pathArg = args.find(({ name }) => name.value === 'path')

              result.idAST = idArg ? idArg.value : null
              result.pathAST = pathArg ? pathArg.value : null
              result.paginate.belongsTo = true
            }

            return null
          }
        }
      })
    }
  })

  return result
}

function variablesFromContext (context, queryVariables = []) {
  return queryVariables.reduce((acc, { path, name, defaultValue }) => {
    // check for $loki to get variables in node fields
    const getPath = context.$loki && !NODE_FIELDS.includes(path[0])
      ? ['fields', ...path]
      : path

    let value = get(context, getPath, defaultValue)

    if (value && isRefField(value)) {
      value = value.id
    }

    acc[name] = value

    return acc
  }, {})
}

module.exports = createPageQuery
