const Server = require('../Server')
const App = require('../../app/App')
const request = require('supertest')
const { prepareUrls } = require('../utils')
const { BOOTSTRAP_CONFIG } = require('../../utils/constants')

test('api.configureServer()', async () => {
  const urls = prepareUrls('localhost', 8080)
  const callback = jest.fn((req, res) => res.send('Hello, world!'))
  const gridsome = await createApp(api => {
    api.configureServer(app => {
      app.get('/my-endpoint', callback)
    })
  })

  const server = new Server(gridsome, urls)
  const app = await server.createExpressApp()
  const res = await request(app).get('/my-endpoint')

  expect(res.text).toEqual('Hello, world!')
  expect(callback.mock.calls).toHaveLength(1)
})

async function createApp(plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_CONFIG)
}
