const createRoutes = require('./createRoutes')

module.exports = async service => {
  const { routes, notFoundComponent } = await createRoutes(service)

  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${routes.map(route => {
    const path = JSON.stringify(route.path)
    const name = JSON.stringify(route.name)
    const chunkName = JSON.stringify(`${route.type}-${route.name}`)
    const component = JSON.stringify(route.component)

    return `{
      path: ${path},
      name: ${name},
      component: () => import(/* webpackChunkName: ${chunkName} */ ${component})
    }`
  }).join(',')}]\n\n`

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
