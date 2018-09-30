const slugify = require('@sindresorhus/slugify')

module.exports = ({ pages, notFoundComponent }) => {
  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${pages.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify(slugify(page.name || page.chunkName))

    const options = [
      `    path: ${JSON.stringify(page.route || page.path)}`,
      `    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`
    ]

    if (page.name) {
      options.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${options.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  res += `export { NotFound }\n\n`

  return res
}
