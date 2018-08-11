const path = require('path')
const Router = require('vue-router')

module.exports = ({ routes }, outDir) => {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: routes.map(page => ({
      path: page.path
    }))
  })

  const pages = []

  for (const page of routes) {
    switch (page.type) {
      case 'page':
        pages.push({
          path: page.path,
          query: page.query,
          route: router.resolve(page.path).route,
          output: path.resolve(outDir, page.path.replace(/^\/+/, ''))
        })
        break
      case 'template':
        const nodes = page.source.nodes.find()
        for (const node of nodes) {
          pages.push({
            path: node.path,
            query: page.query,
            route: router.resolve(node.path).route,
            output: path.resolve(outDir, node.path.replace(/^\/+/, ''))
          })
        }
        break
    }
  }

  return {
    router,
    pages
  }
}
