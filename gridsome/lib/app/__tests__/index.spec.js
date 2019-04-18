const path = require('path')
const createApp = require('../index')
const loadConfig = require('../loadConfig')
const createClientConfig = require('../../webpack/createClientConfig')
const createServerConfig = require('../../webpack/createServerConfig')
const { BOOTSTRAP_CONFIG } = require('../../utils/constants')

const context = path.join(__dirname, '../../__tests__/__fixtures__/project-basic')

let originalEnv

beforeAll(() => {
  originalEnv = { ...process.env }
})

afterEach(() => {
  process.env = originalEnv
})

test('setup basic config', () => {
  const config = loadConfig(context)

  expect(config.chainWebpack).toHaveLength(1)
  expect(config.pathPrefix).toEqual('/')
  expect(config.runtimeCompiler).toEqual(false)
  expect(config.siteUrl).toEqual('https://www.gridsome.org')
  expect(config.baseUrl).toEqual('/')
  expect(config.siteName).toEqual('Gridsome')
  expect(config.titleTemplate).toEqual('%s | Test')
  expect(config.icon.favicon).toHaveProperty('sizes')
  expect(config.icon.favicon).toHaveProperty('src', './src/favicon.png')
  expect(config.icon.touchicon).toHaveProperty('sizes')
  expect(config.icon.touchicon).toHaveProperty('precomposed')
  expect(config.icon.touchicon).toHaveProperty('src', './src/favicon.png')
})

test('load env variables', () => {
  loadConfig(context)

  expect(process.env.GRIDSOME_TEST_VARIABLE).toEqual('TEST_1')
  expect(process.env.TEST_VARIABLE).toEqual('TEST_2')
})

test('load env variables by NODE_ENV', () => {
  process.env.NODE_ENV = 'production'

  loadConfig(context)

  expect(process.env.GRIDSOME_PROD_VARIABLE).toEqual('PROD_1')
  expect(process.env.PROD_VARIABLE).toEqual('PROD_2')
})

test('setup custom favicon and touchicon config', () => {
  const config = loadConfig(context, {
    localConfig: {
      icon: 'src/new-favicon.png'
    }
  })

  expect(config.icon.favicon).toHaveProperty('sizes')
  expect(config.icon.favicon).toHaveProperty('src', 'src/new-favicon.png')
  expect(config.icon.touchicon).toHaveProperty('sizes')
  expect(config.icon.touchicon).toHaveProperty('precomposed')
  expect(config.icon.touchicon).toHaveProperty('src', 'src/new-favicon.png')
})

test('setup webpack client config', async () => {
  const app = await createApp(context, undefined, BOOTSTRAP_CONFIG)
  const chain = await createClientConfig(app)
  const config = chain.toConfig()

  expect(config.output.publicPath).toEqual('/')
  expect(config.entry.app).toHaveLength(1)
  expect(config.entry.app[0]).toMatch(/entry\.client\.js$/)
  expect(config.entry.app[0]).toMatch(/entry\.client\.js$/)
  expect(config.resolve.alias['~']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['@']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['gridsome$']).toEqual(path.resolve(__dirname, '../../../app/index.js'))

  const postcss = chain.module.rule('postcss').oneOf('normal').use('postcss-loader').toConfig()
  expect(postcss.options.plugins).toHaveLength(1)
  expect(postcss.options.plugins[0]).toBeInstanceOf(Function)
})

test('setup webpack server config', async () => {
  const app = await createApp(context, undefined, BOOTSTRAP_CONFIG)
  const chain = await createServerConfig(app)
  const config = chain.toConfig()

  expect(config.target).toEqual('node')
  expect(config.output.publicPath).toEqual('/')
  expect(config.output.libraryTarget).toEqual('commonjs2')
  expect(config.entry.app).toHaveLength(1)
  expect(config.entry.app[0]).toMatch(/entry\.server\.js$/)
  expect(config.resolve.alias['~']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['@']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['gridsome$']).toEqual(path.resolve(__dirname, '../../../app/index.js'))
})

test('setup style loader options', async () => {
  const app = await createApp(context, {
    localConfig: {
      css: {
        split: true,
        loaderOptions: {
          css: { url: false },
          sass: { indentedSyntax: false },
          scss: { data: '@import "variables.scss";' },
          less: { strictMath: true },
          stylus: { use: ['plugin'] },
          postcss: {
            ident: 'postcss',
            plugins: ['plugin']
          }
        }
      }
    }
  }, BOOTSTRAP_CONFIG)

  const chain = await createClientConfig(app)
  const oneOf = ['normal', 'modules']

  expect(app.config.css.split).toEqual(true)

  oneOf.forEach(oneOf => {
    const css = chain.module.rule('css').oneOf(oneOf).use('css-loader').toConfig()
    const postcss = chain.module.rule('postcss').oneOf(oneOf).use('postcss-loader').toConfig()
    const sass = chain.module.rule('sass').oneOf(oneOf).use('sass-loader').toConfig()
    const scss = chain.module.rule('scss').oneOf(oneOf).use('sass-loader').toConfig()
    const less = chain.module.rule('less').oneOf(oneOf).use('less-loader').toConfig()
    const stylus = chain.module.rule('stylus').oneOf(oneOf).use('stylus-loader').toConfig()

    expect(css.options.url).toEqual(false)
    expect(postcss.options.ident).toEqual('postcss')
    expect(postcss.options.plugins).toHaveLength(2)
    expect(postcss.options.plugins[0]).toEqual('plugin')
    expect(postcss.options.plugins[1]).toBeInstanceOf(Function)
    expect(sass.options.indentedSyntax).toEqual(false)
    expect(scss.options.data).toEqual('@import "variables.scss";')
    expect(less.options.strictMath).toEqual(true)
    expect(stylus.options.use[0]).toEqual('plugin')
  })
})
