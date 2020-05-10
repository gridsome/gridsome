const slash = require('slash')
const { relative } = require('path')
const { pathToFilePath } = require('../../pages/utils')
const { NOT_FOUND_NAME } = require('../../utils/constants')
const { uniqBy } = require('lodash')

const isUnitTest = process.env.GRIDSOME_TEST === 'unit'

const isDev = process.env.NODE_ENV === 'development'

function hasCodeMeta(item) {
  return Object
    .keys(item.meta)
    .filter(key => key[0] === '$')
    .length > 0
}

function genRoutes(app) {
  const { lazyLoadRoutes } = app.config.experimental
  const redirects = app.config.redirects.filter(rule => rule.status === 301)
  const fallback = app.pages._routes.findOne({ name: NOT_FOUND_NAME })
  const items = []

  const createRouteItem = (
    route,
    name = route.name,
    path = route.path,
    componentId = route.internal.componentId
  ) => ({
    name,
    path,
    id: route.id,
    type: route.type,
    meta: route.internal.meta,
    chunkName: route.internal.chunkName,
    componentId,
    componentPath: isUnitTest
      ? relative(app.context, route.component)
      : route.component
  })

  for (const redirect of redirects) {
    items.push(redirect)
  }

  for (const route of app.pages.routes()) {
    items.push(createRouteItem(route))
  }

  // use the /404 page as fallback route
  if (fallback) {
    items.push(createRouteItem(fallback, '*', '*', 'notFound'))
  }

  const routes = items
    .map(item => {
      if (item.from && item.to) {
        return genRedirect(item)
      }
      return (
        lazyLoadRoutes
          ? item.type === 'dynamic'
          : true ||
        hasCodeMeta(item)
      ) && genRoute(item)
    })
    .filter(Boolean)

  const componentItems = uniqBy(
    items.filter(item => item.componentId),
    'componentId'
  )

  return [
    `${componentItems.map(genComponent).join('\n')}\n\n`,
    `export default [${routes.join(',')}\n]\n`
  ].join('')
}

function genComponent(item) {
  const componentPath = JSON.stringify(item.componentPath)
  const chunkName = JSON.stringify(item.chunkName)

  return [
    `export const ${item.componentId} = `,
    `() => import(/* webpackChunkName: ${chunkName} */ ${componentPath})`
  ].join('')
}

function genRedirect (rule) {
  const props = []

  props.push(`    path: ${JSON.stringify(rule.from)}`)
  props.push(`    redirect: ${JSON.stringify(rule.to)}`)

  return `\n  {\n${props.join(',\n')}\n  }`
}

function genRoute (item) {
  const props = []
  const metas = []

  props.push(`    path: ${JSON.stringify(item.path)}`)
  props.push(`    component: ${item.componentId}`)

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
