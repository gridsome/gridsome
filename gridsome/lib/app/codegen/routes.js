const { uniqBy } = require('lodash')
const { NOT_FOUND_NAME } = require('../../utils/constants')

function genRoutes (app, routeMeta = {}) {
  let res = ''

  const pages = uniqBy(app.pages.allPages(), page => page.route)
  const notFound = app.pages.findPage({ name: NOT_FOUND_NAME })

  // use the /404 page as fallback route
  pages.push({
    ...notFound,
    dataInfo: routeMeta[notFound.route],
    name: '*',
    route: '*'
  })

  res += `export default [${pages.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify(page.chunkName)
    const dataInfo = page.dataInfo || routeMeta[page.route]
    const props = []
    const metas = []

    props.push(`    path: ${JSON.stringify(page.route)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (typeof dataInfo === 'string') {
      metas.push(`data: () => import(/* webpackChunkName: ${chunkName} */ ${JSON.stringify(dataInfo)})`)
    } else if (Array.isArray(dataInfo)) {
      metas.push(`data: ${JSON.stringify(dataInfo)}`)
    } else if (process.env.GRIDSOME_MODE !== 'static' && (page.query.document || page.context)) {
      metas.push(`data: true`)
    }

    if (metas.length) props.push(`    meta: { ${metas.join(', ')} }`)

    if (page.name) {
      props.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  return res
}

module.exports = genRoutes
