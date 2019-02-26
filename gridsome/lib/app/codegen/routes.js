const slugify = require('@sindresorhus/slugify')

function genRoutes (app) {
  let res = ''

  const routes = app.routes.slice()
  const notFound = routes.find(route => route.name === '404')

  // use the /404 page as fallback route
  routes.push({
    ...notFound,
    chunkName: notFound.name,
    name: '*',
    path: '*'
  })

  res += `export default [${routes.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify('component--' + slugify(page.chunkName || page.name))
    const props = []
    const metas = []

    props.push(`    path: ${JSON.stringify(page.route || page.path)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (page.pageQuery.query === null) metas.push('isStatic: true')
    if (page.isIndex === false) metas.push('isIndex: false')

    if (metas.length) props.push(`    meta: { ${metas.join(', ')} }`)

    if (page.name) {
      props.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  return res
}

module.exports = genRoutes
