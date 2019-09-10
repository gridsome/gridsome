const moment = require('moment')
const { isPlainObject, get } = require('lodash')

const ISO_8601_FORMAT = [
  'YYYY',
  'YYYY-MM',
  'YYYY-MM-DD',
  'YYYYMMDD',

  // Local Time
  'YYYY-MM-DDTHH',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DDTHHmm',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHHmmss',
  'YYYY-MM-DDTHH:mm:ss.SSS',
  'YYYY-MM-DDTHHmmss.SSS',

  // Coordinated Universal Time (UTC)
  'YYYY-MM-DDTHHZ',
  'YYYY-MM-DDTHH:mmZ',
  'YYYY-MM-DDTHHmmZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHHmmssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DDTHHmmss.SSSZ',

  'YYYY-[W]WW',
  'YYYY[W]WW',
  'YYYY-[W]WW-E',
  'YYYY[W]WWE',
  'YYYY-DDDD',
  'YYYYDDDD'
]

exports.createFile = function (options) {
  const file = {
    contents: options.contents
  }

  if (options.path) file.path = options.path
  if (options.data) file.data = options.data

  return file
}

exports.normalizeLayout = function (layout) {
  const defaultLayout = require.resolve('../src/VueRemarkLayout.js')

  if (typeof layout === 'string') {
    return { component: layout, props: {}}
  } else if (typeof layout === 'object') {
    return {
      component: layout.component || defaultLayout,
      props: layout.props || {}
    }
  }

  return { component: defaultLayout, props: {}}
}

exports.makePathParams = (object, { routeKeys, dateField = 'date' }, slugify) => {
  const date = moment.utc(object[dateField], ISO_8601_FORMAT, true)
  const length = routeKeys.length
  const params = {}

  /**
   * Param values are slugified but the original
   * value will be available with '_raw' suffix.
   */
  for (let i = 0; i < length; i++) {
    const { name, fieldName, repeat, suffix } = routeKeys[i]
    const { path: fieldPath } = routeKeys[i]

    const field = get(object, fieldPath, fieldName)

    if (fieldName === 'id') params.id = object.id
    else if (fieldName === 'year' && !object.year) params.year = date.format('YYYY')
    else if (fieldName === 'month' && !object.month) params.month = date.format('MM')
    else if (fieldName === 'day' && !object.day) params.day = date.format('DD')
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
            : slugify(String(value))
        } else {
          return ''
        }
      }).filter(Boolean)

      params[name] = repeated ? segments : segments[0]
    }
  }

  return params
}
