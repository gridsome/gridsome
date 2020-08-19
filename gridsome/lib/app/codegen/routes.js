const slash = require('slash')
const { relative } = require('path')
const { slugify } = require('../../utils')
const { pathToFilePath } = require('../../pages/utils')
const { NOT_FOUND_NAME } = require('../../utils/constants')
const { uniqBy } = require('lodash')

const isUnitTest = process.env.GRIDSOME_TEST === 'unit'

function genRoutes(app) {
  const redirects = app.config.redirects.filter(rule => rule.status === 301)
  const fallback = app.pages._routes.findOne({ name: NOT_FOUND_NAME })
  const components = []
  const items = []

  const createRouteItem = (route, name = route.name, path = route.path) => ({
    name,
    path,
    chunkName: genChunkName(app.context, route),
    variableName: components.includes(route.component)
      ? `c${(components.indexOf(route.component) + 1)}`
      : `c${components.push(route.component)}`,
    meta: route.internal.meta,
    type: route.type,
    component: isUnitTest
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
    items.push(createRouteItem(fallback, '*', '*'))
  }

  const routes = items.map(item => {
    if (item.from && item.to) {
      return genRedirect(item)
    }
    return genRoute(item)
  })

  const componentItems = uniqBy(
    items.filter(item => item.component),
    'component'
  )

  return [
    `${componentItems.map(genComponent).join('\n')}\n\n`,
    `export default [${routes.join(',')}\n]\n`
  ].join('')
}

function genComponent(item) {
  const component = JSON.stringify(item.component)
  const chunkName = JSON.stringify(item.chunkName)

  return [
    `const ${item.variableName} = `,
    `() => import(/* webpackChunkName: ${chunkName} */ ${component})`
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
  props.push(`    component: ${item.variableName}`)

  if (item.type === 'dynamic') {
    const dataPath = pathToFilePath(item.path, 'json')
    metas.push(`dataPath: ${JSON.stringify(slash(dataPath))}`)
    metas.push(`dynamic: true`)
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

function genChunkName (context, route) {
  const chunkName = relative(context, route.component)
    .split('/')
    .filter(s => s !== '..')
    .map(s => slugify(s))
    .join('--')

  return `page--${chunkName}`
}

module.exports = genRoutes
