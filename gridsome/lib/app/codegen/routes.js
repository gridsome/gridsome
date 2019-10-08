const slash = require('slash')
const { uniqBy } = require('lodash')
const { relative } = require('path')
const { pathToFilePath } = require('../../pages/utils')
const { NOT_FOUND_NAME } = require('../../utils/constants')

const isDev = process.env.NODE_ENV === 'development'

function genRoutes(app) {
  const createRouteItem = (route, name = route.name, path = route.path) => ({
    name,
    id: route.id,
    component: relative(app.config.tmpDir, route.component),
    chunkName: route.internal.chunkName,
    meta: route.internal.meta,
    type: route.type,
    path
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

  const components = uniqBy(items, 'component')
    .filter(item => item.type === 'static')
    .map(item => genComponent(item))

  components.push(genComponent(createRouteItem(fallback), 'not-found'))

  const redirectRoutes = items
    .filter(item => item.from && item.to)
    .map(item => genRedirect(item))

  const routes = items
    .filter(item => item.type === 'dynamic')
    .map(item => genRoute(item))

  let code = ''

  code += `export const components = {\n${components.join(',\n')}\n}\n\n`
  code += `export default [${redirectRoutes.concat(routes).join(',')}\n]\n\n`

  return code
}

function genComponent (item, key = item.chunkName) {
  const component = JSON.stringify(item.component)
  const chunkName = JSON.stringify(item.chunkName)

  return `  ${JSON.stringify(key)}: () => import(/* webpackChunkName: ${chunkName} */ ${component})`
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

  const props = []
  const metas = []

  props.push(`    path: ${JSON.stringify(item.path)}`)
  props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

  if (item.type === 'dynamic') {
    const dataPath = pathToFilePath(item.path, 'json')
    metas.push(`dataPath: ${JSON.stringify(slash(dataPath))}`)
    metas.push(`dynamic: true`)
  }

  if (isDev) {
    metas.push(`routeId: ${JSON.stringify(item.id)}`)
  }

  if (item.meta) {
    for (const key in item.meta) {
      const value = item.meta[key]

      if (key[0] === '$') {
        metas.push(`${key}: ${value}`)
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

module.exports = genRoutes
