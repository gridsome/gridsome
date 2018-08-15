module.exports = ({ routes, notFoundComponent }) => {
  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${routes.map(route => {
    const component = JSON.stringify(route.component)
    const chunkName = JSON.stringify(route.name || route.chunkName)

    const options = [
      `    path: ${JSON.stringify(route.route || route.path)}`,
      `    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`
    ]

    if (route.name) {
      options.unshift(`    name: ${JSON.stringify(route.name)}`)
    }

    return `\n  {\n${options.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  res += `export { NotFound }\n\n`

  res += `export default router => {
  router.addRoutes([...routes, {
    path: '*',
    name: '404',
    component: NotFound
  }])
}\n`

  return res
}
