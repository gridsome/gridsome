const path = require('path')
const { slugify } = require('../../utils')
const { isPlainObject } = require('lodash')
const { NOT_FOUND_NAME } = require('../../utils/constants')

function genRoutes (app, routeMeta = {}) {
  const createRouteItem = (route, name = route.options.name, path = route.path) => ({
    name,
    path,
    component: route.component,
    chunkName: genChunkName(app.context, route),
    routeMeta: routeMeta[route.path],
    meta: route.internal.meta
  })

  const items = app.pages.routes().map(route => {
    return createRouteItem(route)
  })

  // use the /404 page as fallback route
  const fallback = app.pages._routes.findOne({ name: NOT_FOUND_NAME })
  items.push(createRouteItem(fallback, '*', '*'))

  const res = items.map(items => {
    return genRoute(items, routeMeta[items.path])
  })

  return `export default [${res.join(',')}\n]\n\n`
}

function genRoute (item) {
  const component = JSON.stringify(item.component)
  const chunkName = JSON.stringify(item.chunkName)

  const routeMeta = item.routeMeta
  const props = []
  const metas = []

  props.push(`    path: ${JSON.stringify(item.path)}`)
  props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

  if (typeof routeMeta === 'string') {
    metas.push(`data: () => import(/* webpackChunkName: ${chunkName} */ ${JSON.stringify(routeMeta)})`)
  } else if (Array.isArray(routeMeta)) {
    metas.push(`data: ${JSON.stringify(routeMeta)}`)
  } else if (process.env.GRIDSOME_MODE !== 'static') {
    metas.push(`data: true`)
  }

  if (item.meta) {
    for (const key in item.meta) {
      const value = item.meta[key]

      if (isPlainObject(value)) {
        switch (value.type) {
          case 'import': {
            const path = JSON.stringify(value.path)
            const chunkName = JSON.stringify(value.chunkName || item.chunkName)
            const importCode = `import(/* webpackChunkName: ${chunkName} */ ${path})`

            metas.push(`${key}: () => ${importCode}`)

            break
          }
          case 'code': {
            metas.push(`${key}: ${value.code}`)

            break
          }
        }
      } else {
        metas.push(`${key}: ${JSON.stringify(value)}`)
      }
    }
  }

  if (item.name) {
    props.unshift(`    name: ${JSON.stringify(item.name)}`)
  }

  if (metas.length) {
    props.push(`    meta: {\n      ${metas.join(',\n      ')}\n    }`)
  }

  return `\n  {\n${props.join(',\n')}\n  }`
}

function genChunkName (context, route) {
  const chunkName = path.relative(context, route.component)
    .split('/')
    .filter(s => s !== '..')
    .map(s => slugify(s))
    .join('--')

  return `page--${chunkName}`
}

module.exports = genRoutes
