const path = require('path')
const { uniqBy } = require('lodash')
const slugify = require('@sindresorhus/slugify')

function genRoutes (app, routeMeta = {}) {
  let res = ''

  const pages = uniqBy(app.pages.allPages(), page => page.route)
  const notFound = app.pages.findPage({ path: '/404' })

  // use the /404 page as fallback route
  pages.push({
    ...notFound,
    routeMeta: routeMeta[notFound.route],
    name: '*',
    route: '*'
  })

  res += `export default [${pages.map(page => {
    const component = JSON.stringify(page.component)
    const name = (page.chunkName || slugify(path.parse(component).name))
    const chunkName = JSON.stringify('component--' + name)
    const queryMeta = page.routeMeta || routeMeta[page.route]
    const props = []
    const metas = []

    props.push(`    path: ${JSON.stringify(page.route)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (typeof queryMeta === 'string') {
      metas.push(`data: () => import(/* webpackChunkName: ${chunkName} */ ${JSON.stringify(queryMeta)})`)
    } else if (Array.isArray(queryMeta)) {
      metas.push(`data: ${JSON.stringify(queryMeta)}`)
    } else if (process.env.NODE_ENV === 'development' && (page.query.document || page.context)) {
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
