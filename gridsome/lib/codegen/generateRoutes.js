const slugify = require('@sindresorhus/slugify')

module.exports = ({ pages, notFoundComponent }) => {
  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${pages.map(page => {
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

  res += `export { NotFound }\n\n`

  return res
}
