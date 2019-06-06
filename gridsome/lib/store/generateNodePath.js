const moment = require('moment')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { isString, isPlainObject, trim, get } = require('lodash')

module.exports = function generateNodePath (node, contentType) {
  return {
    ...node,
    path: createPath(node, contentType)
  }
}

function createPath (node, contentType) {
  const { route, routeKeys, dateField } = contentType.options

  if (!isString(route)) {
    return isString(node.path)
      ? '/' + trim(node.path, '/')
      : null
  }

  const date = moment.utc(node[dateField], ISO_8601_FORMAT, true)
  const length = routeKeys.length
  const params = {}

  // Param values are slugified but the original
  // value will be available with '_raw' suffix.
  for (let i = 0; i < length; i++) {
    const { name, fieldName, repeat, suffix } = routeKeys[i]
    let { path } = routeKeys[i]

    // TODO: remove before 1.0
    // let slug fallback to title
    if (name === 'slug' && !node.slug) {
      path = ['title']
    }

    const field = get(node, path, fieldName)

    if (fieldName === 'id') params.id = node.id
    else if (fieldName === 'year' && !node.year) params.year = date.format('YYYY')
    else if (fieldName === 'month' && !node.month) params.month = date.format('MM')
    else if (fieldName === 'day' && !node.day) params.day = date.format('DD')
    else {
      const repeated = repeat && Array.isArray(field)
      const values = repeated ? field : [field]

      const segments = values.map(value => {
        if (
          isPlainObject(value) &&
          value.hasOwnProperty('typeName') &&
          value.hasOwnProperty('id') &&
          !Array.isArray(value.id)
        ) {
          return String(value.id)
        } else if (!isPlainObject(value)) {
          return suffix === 'raw'
            ? String(value)
            : contentType.slugify(String(value))
        } else {
          return ''
        }
      }).filter(Boolean)

      params[name] = repeated ? segments : segments[0]
    }
  }

  return '/' + trim(contentType.options.createPath(params), '/')
}
