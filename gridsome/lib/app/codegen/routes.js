const slugify = require('@sindresorhus/slugify')

const {
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE
} = require('../../utils/constants')

function genRoutes (app) {
  let res = ''

  const routes = app.routes.sortedRoutes
  const notFound = routes.find(route => route.name === '404')

  // use the /404 page as fallback route
  routes.push({
    ...notFound,
    chunkName: notFound.name,
    name: '*',
    path: '*'
  })

  res += `export default [${routes.map(route => {
    const component = JSON.stringify(route.component)
    const chunkName = JSON.stringify('component--' + slugify(route.chunkName || route.name))
    const hasData = !!route.pageQuery.query
    const isIndex = route.isIndex === true
    const props = []
    const metas = []

    props.push(`    path: ${JSON.stringify(route.route || route.path)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (!isIndex) metas.push('isIndex: false')

    if (hasData && route.renderQueue.length) {
      if ([STATIC_ROUTE, STATIC_TEMPLATE_ROUTE].includes(route.type)) {
        const [entry] = route.renderQueue
        metas.push(`hash: ${JSON.stringify(entry.hashSum)}`)
      } else {
        const metaDataPath = JSON.stringify(route.metaDataPath)
        metas.push(`hash: () => import(/* webpackChunkName: ${chunkName} */ ${metaDataPath})`)
      }
    }

    if (metas.length) props.push(`    meta: { ${metas.join(', ')} }`)

    if (route.name) {
      props.unshift(`    name: ${JSON.stringify(route.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  return res
}

module.exports = genRoutes
