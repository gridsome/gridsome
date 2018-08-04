const path = require('path')
const Router = require('vue-router')
const { findAll } = require('../../utils')

module.exports = async (pages, outDir) => {
  const router = createRouter(pages)
  const data = []

  for (const page of pages) {
    switch (page.type) {
      case 'page':
        data.push({
          path: page.path,
          query: page.query,
          route: router.resolve(page.path).route,
          output: path.resolve(outDir, page.path.replace(/^\/+/, ''))
        })
        break
      case 'template':
        const nodes = await findAll(page.source.nodes)
        for (const node of nodes) {
          data.push({
            path: node.path,
            query: page.query,
            route: router.resolve(node.path).route,
            output: path.resolve(outDir, node.path.replace(/^\/+/, ''))
          })
        }
        break
    }
  }

  return data
}

function createRouter (pages) {
  return new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: pages.map(page => ({
      path: page.path
    }))
  })
}
