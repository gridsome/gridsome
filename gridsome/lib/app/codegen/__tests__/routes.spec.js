const App = require('../../App')
const genRoutes = require('../routes')
const { NOT_FOUND_NAME } = require('../../../utils/constants')

function fixwinpath(routestr) {
  routestr = routestr.replace(/\\\\/g, '/')
  routestr = routestr.replace(/page--fixtures-page/g, 'page--fixtures--page')
  return routestr
}

test('generate a simple route', async () => {
  const app = await new App(__dirname).init()

  app.pages.createPage({
    path: '/page',
    component: './__fixtures__/PageA.vue'
  })

  let testroutes = fixwinpath(genRoutes(app))
  expect(testroutes).toMatchSnapshot()
})

test('generate a route with meta', async () => {
  const app = await new App(__dirname).init()

  app.pages.createPage({
    path: '/page',
    component: './__fixtures__/PageA.vue',
    route: {
      meta: {
        string: 'test',
        boolean: true,
        number: 2
      }
    }
  })

  let testroutes = fixwinpath(genRoutes(app))
  expect(testroutes).toMatchSnapshot()
})

test('generate a route with raw code as meta', async () => {
  const app = await new App(__dirname).init()

  app.pages.createPage({
    path: '/page',
    component: './__fixtures__/PageA.vue',
    route: {
      meta: {
        $log: `() => console.log('hello!')`
      }
    }
  })

  let testroutes = fixwinpath(genRoutes(app))
  expect(testroutes).toMatchSnapshot()
})

test('generate component imports as variables', async () => {
  const app = await new App(__dirname).init()

  app.pages.createPage({
    path: '/404',
    name: NOT_FOUND_NAME,
    component: './__fixtures__/PageC.vue'
  })

  for (let i = 1; i < 4; i++) {
    app.pages.createPage({
      path: '/page-a/' + i,
      component: './__fixtures__/PageA.vue'
    })
  }

  app.pages.createPage({
    path: '/page-b',
    component: './__fixtures__/PageB.vue'
  })

  app.pages.createPage({
    path: '/user/:id',
    component: './__fixtures__/PageC.vue'
  })

  let testroutes = fixwinpath(genRoutes(app))
  expect(testroutes).toMatchSnapshot()
})


test('generate redirect routes', async () => {
  const app = await new App(__dirname, {
    config: {
      redirects: [
        { from: '/old', to: '/page' }
      ]
    }
  }).init()

  app.pages.createPage({
    path: '/page',
    component: './__fixtures__/PageA.vue'
  })

  let testroutes = fixwinpath(genRoutes(app))
  expect(testroutes).toMatchSnapshot()
})
