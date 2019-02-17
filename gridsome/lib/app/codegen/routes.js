const slugify = require('@sindresorhus/slugify')

function genRoutes (app) {
  let res = ''

  res += `export default [${app.routes.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify('component--' + slugify(page.name || page.chunkName))
    const props = []

    props.push(`    path: ${JSON.stringify(page.route || page.path)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (page.pageQuery.query) {
      props.push(`    meta: { data: true }`)
    }

    if (page.name) {
      props.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  return res
}

module.exports = genRoutes
