const camelCase = require('camelcase')
const createRoutes = require('./create-routes')

module.exports = async service => {
  const { routes, notFoundComponent } = await createRoutes(service)

  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${routes.map(route => `{
      path: ${JSON.stringify(route.path)},
      name: ${route.name ? JSON.stringify(route.name) : 'null'},
      component: () => import(/* webpackChunkName: ${JSON.stringify(route.name)} */ ${JSON.stringify(route.component)})
    }`).join(',')}]\n\n`

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
