const App = require('../../app/App')
const request = require('supertest')
const { BOOTSTRAP_CONFIG } = require('../../utils/constants')

test('should have hostname and port', async () => {
  const app = await createApp()

  expect(app.server.hostname).toEqual('0.0.0.0')
  expect(app.server.port).toBeDefined()
  expect(app.server.urls.local.url).toEqual(`http://localhost:${app.server.port}/`)
})

test('use some webpack.devServer options', async () => {
  const app = await createApp(api => {
    api.configureWebpack((config) => ({
      ...config,
      devServer: {
        https: true,
        host: '192.168.1.123',
        port: 8888
      }
    }))
  })

  expect(app.server.hostname).toEqual('192.168.1.123')
  expect(app.server.port).toEqual(8888)
  expect(app.server.urls.local.url).toEqual('https://192.168.1.123:8888/')
})

test('api.configureServer()', async () => {
  const callback = jest.fn((req, res) => res.send('Hello, world!'))
  const app = await createApp(api => {
    api.configureServer(app => {
      app.get('/my-endpoint', callback)
    })
  })

  const express = await app.server.createExpressApp()
  const res = await request(express).get('/my-endpoint')

  expect(res.text).toEqual('Hello, world!')
  expect(callback.mock.calls).toHaveLength(1)
})

async function createApp(plugin) {
  const app = await new App(__dirname, {
    mode: 'development',
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_CONFIG)
}
