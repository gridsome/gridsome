const path = require('path')
const { slugify } = require('../../utils')
const { isPlainObject } = require('lodash')
const { NOT_FOUND_NAME } = require('../../utils/constants')

function genRoutes (app, routeMeta = new Map()) {
  const { trailingSlash } = app.config.permalinks || {}

  const createRouteItem = (route, name = route.options.name, path = route.path) => ({
    name,
    component: route.component,
    chunkName: genChunkName(app.context, route),
    routeMeta: routeMeta.get(route.id),
    meta: route.internal.meta,
    type: route.type,
    path: trailingSlash && route.type === 'static' && path !== '*' && path !== '/'
      ? path + '/'
      : path
  })

  const redirects = app.config.redirects.filter(rule => rule.status === 301)
  const fallback = app.pages._routes.findOne({ name: NOT_FOUND_NAME })
  const items = []

  for (const redirect of redirects) {
    items.push(redirect)
  }

  for (const route of app.pages.routes()) {
    items.push(createRouteItem(route))
  }

  // use the /404 page as fallback route
  items.push(createRouteItem(fallback, '*', '*'))

  const routes = items.map(item => {
    if (item.from && item.to) {
      return genRedirect(item)
    }

    return genRoute(item, routeMeta[items.path])
  })

  return `export default [${routes.join(',')}\n]\n\n`
}

function genRedirect (rule) {
  const props = []

  props.push(`    path: ${JSON.stringify(rule.from)}`)
  props.push(`    redirect: ${JSON.stringify(rule.to)}`)

  return `\n  {\n${props.join(',\n')}\n  }`
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

  if (item.type === 'dynamic') {
    metas.push(`dynamic: true`)
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
