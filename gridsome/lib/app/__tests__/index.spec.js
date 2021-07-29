const path = require('path')
const App = require('../App')
const createApp = require('../index')
const PluginAPI = require('../PluginAPI')
const loadConfig = require('../loadConfig')
const { BOOTSTRAP_CONFIG } = require('../../utils/constants')

const context = path.join(__dirname, '../../__tests__/__fixtures__/project-basic')
const originalEnv = { ...process.env }

beforeEach(() => {
  Object.assign(process.env, originalEnv, { NODE_ENV: 'production' })
})

afterEach(() => {
  Object.assign(process.env, originalEnv)
})

test('setup basic config', async () => {
  const config = await loadConfig(context)

  expect(config.chainWebpack).toHaveLength(1)
  expect(config.pathPrefix).toEqual('')
  expect(config.publicPath).toEqual('/')
  expect(config.runtimeCompiler).toEqual(false)
  expect(config.siteUrl).toEqual('https://www.gridsome.org')
  expect(config.siteName).toEqual('Gridsome')
  expect(config.titleTemplate).toEqual('%s | Test')
  expect(config.icon.favicon).toHaveProperty('sizes')
  expect(config.icon.favicon).toHaveProperty('src', './src/favicon.png')
  expect(config.icon.touchicon).toHaveProperty('sizes')
  expect(config.icon.touchicon).toHaveProperty('precomposed')
  expect(config.icon.touchicon).toHaveProperty('src', './src/favicon.png')
})

test('setup basic config for path prefix', async () => {
  const context = path.join(__dirname, '../../__tests__/__fixtures__/project-path-prefix')
  const config = await loadConfig(context)

  expect(config.pathPrefix).toEqual('/sub/-/dir')
  expect(config.publicPath).toEqual('/sub/-/dir/')
})

test('load env variables', async () => {
  process.env.NODE_ENV = 'development'

  await loadConfig(context)

  expect(process.env.GRIDSOME_TEST_VARIABLE).toEqual('TEST_1')
  expect(process.env.TEST_VARIABLE).toEqual('TEST_2')
})

test('load env variables by NODE_ENV', async () => {
  process.env.NODE_ENV = 'production'

  await loadConfig(context)

  expect(process.env.GRIDSOME_PROD_VARIABLE).toEqual('PROD_1')
  expect(process.env.PROD_VARIABLE).toEqual('PROD_2')
})

test('setup custom favicon and touchicon config', async () => {
  const config = await loadConfig(context, {
    localConfig: {
      icon: './src/new-favicon.png'
    }
  })

  expect(config.icon.favicon).toHaveProperty('sizes')
  expect(config.icon.favicon).toHaveProperty('src', './src/new-favicon.png')
  expect(config.icon.touchicon).toHaveProperty('sizes')
  expect(config.icon.touchicon).toHaveProperty('precomposed')
  expect(config.icon.touchicon).toHaveProperty('src', './src/new-favicon.png')
})

test('set custom favicon sizes', async () => {
  const config = await loadConfig(context, {
    localConfig: {
      icon: {
        favicon: {
          src: './src/new-favicon.png',
          sizes: [16, 32]
        }
      }
    }
  })

  expect(config.icon.favicon).toMatchObject({
    src: './src/new-favicon.png',
    sizes: [16, 32]
  })

  expect(config.icon.touchicon).toMatchObject({
    src: './src/new-favicon.png',
    sizes: [76, 152, 120, 167, 180],
    precomposed: false
  })
})

test('set custom image processing options', async () => {
  const config = await loadConfig(context, {
    localConfig: {
      images: {
        compress: false,
        defaultBlur: 5,
        defaultQuality: 90,
        backgroundColor: 'red'
      }
    }
  })

  expect(config.images.compress).toEqual(false)
  expect(config.images.defaultBlur).toEqual(5)
  expect(config.images.defaultQuality).toEqual(90)
  expect(config.images.backgroundColor).toEqual('red')
})

test('setup templates config from string', async () => {
  const config = await loadConfig(context, {
    localConfig: {
      templates: {
        Post: '/:year/:month/:day/:slug'
      }
    }
  })

  expect(config.templates.Post).toHaveLength(1)
  expect(config.templates.Post[0]).toMatchObject({
    typeName: 'Post',
    path: '/:year/:month/:day/:slug',
    component: path.join(context, 'src/templates/Post.vue'),
    name: 'default'
  })
})

test('setup templates config from array', async () => {
  const genPath = node => `/test/${node.id}`
  const config = await loadConfig(context, {
    localConfig: {
      templates: {
        Post: [
          '/:year/:month/:day/:slug',
          {
            name: 'info',
            path: '/:year/:month/:day/:slug/info',
            component: './src/templates/PostInfo.vue'
          },
          {
            name: 'author',
            path: '/:year/:month/:day/:slug/author',
            component: './src/templates/PostAuthor.vue'
          },
          {
            name: 'author2',
            path: genPath,
            component: './src/templates/PostAuthor.vue'
          }
        ]
      }
    }
  })

  expect(config.templates.Post).toHaveLength(4)
  expect(config.templates.Post[0]).toMatchObject({
    typeName: 'Post',
    path: '/:year/:month/:day/:slug',
    component: path.join(context, 'src/templates/Post.vue'),
    name: 'default'
  })
  expect(config.templates.Post[1]).toMatchObject({
    typeName: 'Post',
    path: '/:year/:month/:day/:slug/info',
    component: path.join(context, 'src/templates/PostInfo.vue'),
    name: 'info'
  })
  expect(config.templates.Post[2]).toMatchObject({
    typeName: 'Post',
    path: '/:year/:month/:day/:slug/author',
    component: path.join(context, 'src/templates/PostAuthor.vue'),
    name: 'author'
  })
  expect(config.templates.Post[3]).toMatchObject({
    path: genPath,
    component: path.join(context, 'src/templates/PostAuthor.vue'),
    name: 'author2'
  })
})

test('fail if a template is an object', () => {
  expect(loadConfig(context, {
    localConfig: {
      templates: {
        Post: {
          path: '/:year/:month/:day/:slug'
        }
      }
    }
  })).rejects.toThrow('cannot be an object')
})

test('fail if a template has no name', async () => {
  expect(loadConfig(context, {
    localConfig: {
      templates: {
        Post: [
          '/:year/:month/:day/:slug',
          {
            path: '/:year/:month/:day/:slug/info'
          }
        ]
      }
    }
  })).rejects.toThrow('"name" is required')
})

test('fail if two templates have the same name', async () => {
  expect(loadConfig(context, {
    localConfig: {
      templates: {
        Post: [
          {
            name: 'info',
            path: '/:year/:month/:day/:slug/info'
          },
          {
            name: 'info',
            path: '/:year/:month/:day/:slug/author'
          }
        ]
      }
    }
  })).rejects.toThrow('already exist')
})

test('normalize images config', async () => {
  const config = await loadConfig(context)
  expect(config.images).toMatchObject({
    compress: true,
    defaultQuality: 75,
    backgroundColor: null,
    placeholder: { type: 'blur', defaultBlur: 20 }
  })
})

test('normalize images placeholder config', async () => {
  const config = await loadConfig(context, {
    localConfig: {
      images: {
        placeholder: {
          defaultBlur: 90
        }
      }
    }
  })
  expect(config.images.placeholder).toMatchObject({
    type: 'blur',
    defaultBlur: 90
  })
})

test('setup webpack client config', async () => {
  const app = await createApp(context, undefined, BOOTSTRAP_CONFIG)
  const config = await app.compiler.resolveWebpackConfig()

  expect(config.output.publicPath).toEqual('/')
  expect(config.entry.app).toHaveLength(1)
  expect(config.entry.app[0]).toMatch(/entry\.client\.js$/)
  expect(config.entry.app[0]).toMatch(/entry\.client\.js$/)
  expect(config.resolve.alias['~']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['@']).toEqual(path.join(context, 'src'))
  expect(config.resolve.alias['gridsome$']).toEqual(path.resolve(__dirname, '../../../app/index.js'))

  const chain = await app.compiler.resolveChainableWebpackConfig()
  const postcss = chain.module.rule('postcss').oneOf('normal').use('postcss-loader').toConfig()

  expect(postcss.options.postcssOptions.plugins).toHaveLength(1)
  expect(postcss.options.postcssOptions.plugins[0]).toBeInstanceOf(Function)
})

test('setup webpack server config', async () => {
  const app = await createApp(context, undefined, BOOTSTRAP_CONFIG)
  const config = await app.compiler.resolveWebpackConfig(true)

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
            postcssOptions: {
              plugins: ['plugin']
            }
          }
        }
      }
    }
  }, BOOTSTRAP_CONFIG)

  const chain = await app.compiler.resolveChainableWebpackConfig()
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
    expect(postcss.options.postcssOptions.plugins).toHaveLength(2)
    expect(postcss.options.postcssOptions.plugins[0]).toEqual('plugin')
    expect(postcss.options.postcssOptions.plugins[1]).toBeInstanceOf(Function)
    expect(sass.options.indentedSyntax).toEqual(false)
    expect(scss.options.data).toEqual('@import "variables.scss";')
    expect(less.options.strictMath).toEqual(true)
    expect(stylus.options.use[0]).toEqual('plugin')
  })
})

test('config.chainWebpack', async () => {
  const app = await createApp(context, {
    localConfig: {
      chainWebpack (config) {
        config.mode('none')
      }
    }
  }, BOOTSTRAP_CONFIG)

  const config = app.compiler.getClientConfig()

  expect(config.entry.app).toBeDefined()
  expect(config.mode).toEqual('none')
})

test('config.configureWebpack as object', async () => {
  const app = await createApp(context, {
    localConfig: {
      configureWebpack: {
        mode: 'none'
      }
    }
  }, BOOTSTRAP_CONFIG)

  const config = app.compiler.getClientConfig()

  expect(config.entry.app).toBeDefined()
  expect(config.mode).toEqual('none')
})

test('create new config in config.configureWebpack', async () => {
  const app = await createApp(context, {
    localConfig: {
      configureWebpack: () => ({
        mode: 'none',
        output: {
          publicPath: '/'
        }
      })
    }
  }, BOOTSTRAP_CONFIG)

  const config = app.compiler.getClientConfig()

  expect(config).toMatchObject({
    mode: 'none',
    output: {
      publicPath: '/'
    }
  })
})

test('modify config in config.configureWebpack', async () => {
  const app = await createApp(context, {
    localConfig: {
      configureWebpack: config => {
        config.mode = 'none'
      }
    }
  }, BOOTSTRAP_CONFIG)

  const config = app.compiler.getClientConfig()

  expect(config.entry.app).toBeDefined()
  expect(config.mode).toEqual('none')
})

test('api.configureWebpack as object', async () => {
  const { app, api } = await createPlugin()

  api.configureWebpack({ mode: 'test' })

  const config = await app.compiler.resolveWebpackConfig()

  expect(config.entry.app).toBeDefined()
  expect(config.mode).toEqual('test')
})

test('create new config in api.configureWebpack', async () => {
  const { app, api } = await createPlugin()

  api.configureWebpack(() => ({
    mode: 'test',
    output: {
      publicPath: '/'
    }
  }))

  const config = await app.compiler.resolveWebpackConfig()

  expect(config).toMatchObject({
    mode: 'test',
    output: {
      publicPath: '/'
    }
  })
})

test('modify config in api.configureWebpack', async () => {
  const { app, api } = await createPlugin()

  api.configureWebpack(config => {
    config.mode = 'test'
  })

  const config = await app.compiler.resolveWebpackConfig()

  expect(config.entry.app).toBeDefined()
  expect(config.mode).toEqual('test')
})

test('should return the compiler', async () => {
  const app = await createApp(context, BOOTSTRAP_CONFIG)
  const compiler = app.compiler.getCompiler()

  expect(compiler).not.toBe(null)
})

test('do not allow a custom publicPath', async () => {
  const app = createApp(context, {
    localConfig: {
      pathPrefix: '/test',
      configureWebpack: {
        output: {
          publicPath: '/testing/'
        }
      }
    }
  }, BOOTSTRAP_CONFIG)

  await expect(app).rejects.toThrow('pathPrefix')
})

async function createPlugin (context = '/') {
  const app = await new App(context).init()
  const api = new PluginAPI(app, {
    entry: {
      server: true,
      clientOptions: undefined,
      name: undefined,
      options: {},
      entries: {},
      index: 0,
      uid: ''
    }
  })

  return { app, api }
}
