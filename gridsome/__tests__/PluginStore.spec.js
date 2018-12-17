const App = require('../lib/app/App')
const PluginAPI = require('../lib/app/PluginAPI')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

function createPlugin (context = '/') {
  const app = new App(context, { config: { plugins: [] }}).init()
  const api = new PluginAPI(app, {
    entry: { options: {}, clientOptions: undefined },
    transformers: {
      'application/json': {
        TransformerClass: JSONTransformer,
        options: {},
        name: 'json'
      }
    }
  })

  return api
}

test('add type', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  expect(contentType.typeName).toEqual('TestPost')
  expect(contentType.route).toBeUndefined()
  expect(typeof contentType.makePath).toBe('function')
})

test('add node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const emit = jest.spyOn(contentType, 'emit')
  const node = contentType.addNode({
    id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  const entry = api.store.store.index.findOne({ uid: node.uid })

  expect(node).toHaveProperty('$loki')
  expect(node.id).toEqual('test')
  expect(typeof node.uid).toEqual('string')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('Lorem ipsum dolor sit amet')
  expect(node.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.fields).toMatchObject({})
  expect(emit).toHaveBeenCalledTimes(1)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(node.uid)
  expect(entry.typeName).toEqual('TestPost')

  emit.mockRestore()
})

test('update node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    route: '/test/:slug'
  })

  const emit = jest.spyOn(contentType, 'emit')

  const oldNode = contentType.addNode({
    id: 'test',
    date: '2018-09-04T23:20:33.918Z'
  })

  const oldTimestamp = oldNode.internal.timestamp
  const uid = oldNode.uid

  const node = contentType.updateNode('test', {
    title: 'New title'
  })

  const entry = api.store.store.index.findOne({ uid: node.uid })

  expect(node.id).toEqual('test')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('New title')
  expect(node.slug).toEqual('new-title')
  expect(node.path).toEqual('/test/new-title')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.internal.timestamp).not.toEqual(oldTimestamp)
  expect(emit).toHaveBeenCalledTimes(2)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(uid)
  expect(entry.path).toEqual('/test/new-title')

  emit.mockRestore()
})

test('remove node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const emit = jest.spyOn(contentType, 'emit')
  const node = contentType.addNode({ id: 'test' })

  contentType.removeNode('test')

  const entry = api.store.store.index.findOne({ uid: node.uid })

  expect(contentType.getNode('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)
  expect(entry).toBeNull()

  emit.mockRestore()
})

test('add nodes with custom fields', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({ typeName: 'TestPost' })

  const node = contentType.addNode({
    title: 'Lorem ipsum',
    fields: {
      nullValue: null,
      undefinedValue: undefined,
      falseValue: false,
      test: 'My value',
      list: ['1', '2', '3'],
      objectList: [{ test: 1 }, { test: 2 }],
      number: 24
    }
  })

  expect(node.fields.test).toEqual('My value')
  expect(node.fields.nullValue).toEqual(null)
  expect(node.fields.undefinedValue).toEqual(undefined)
  expect(node.fields.falseValue).toEqual(false)
  expect(node.fields.list).toHaveLength(3)
  expect(node.fields.objectList).toHaveLength(2)
  expect(node.fields.objectList[0]).toMatchObject({ test: 1 })
  expect(node.fields.objectList[1]).toMatchObject({ test: 2 })
  expect(node.fields.number).toEqual(24)
})

test('add type with ref', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  expect(contentType.options.refs.author).toMatchObject({
    typeName: 'TestAuthor',
    fieldName: 'author'
  })
})

test('add type with dynamic route', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    route: '/:year/:month/:day/:slug'
  })

  const node = contentType.addNode({
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(contentType.options.route).toEqual('/:year/:month/:day/:slug')
  expect(node.path).toEqual('/2018/09/05/lorem-ipsum-dolor-sit-amet')
})

test('add type with custom fields in route', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    route: '/:test/:test_raw/:numeric/:author/:slug'
  })

  const node = contentType.addNode({
    title: 'Lorem ipsum',
    fields: {
      test: 'My value',
      numeric: 10,
      author: {
        typeName: 'Author',
        id: '2'
      }
    }
  })

  expect(node.path).toEqual('/my-value/My%20value/10/2/lorem-ipsum')
})

test('transform node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const node = contentType.addNode({
    internal: {
      mimeType: 'application/json',
      content: JSON.stringify({ foo: 'bar' })
    }
  })

  expect(node.fields).toMatchObject({ foo: 'bar' })
})

test('resolve absolute file paths', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType({
    typeName: 'Test',
    resolveAbsolutePaths: true
  })

  const node = contentType.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../image.png',
      url: 'https://example.com/image.jpg',
      url2: '//example.com/image.jpg',
      url3: 'git@github.com:gridsome/gridsome.git',
      url4: 'ftp://ftp.example.com',
      email: 'email@example.com',
      text: 'Lorem ipsum dolor sit amet.',
      text2: 'example.com',
      text3: 'md'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.fields.file).toEqual('/absolute/dir/to/a/image.png')
  expect(node.fields.file2).toEqual('/absolute/dir/to/project/image.png')
  expect(node.fields.file3).toEqual('/absolute/dir/to/image.png')
  expect(node.fields.text).toEqual('Lorem ipsum dolor sit amet.')
  expect(node.fields.text2).toEqual('example.com')
  expect(node.fields.text3).toEqual('md')
  expect(node.fields.url).toEqual('https://example.com/image.jpg')
  expect(node.fields.url2).toEqual('//example.com/image.jpg')
  expect(node.fields.url3).toEqual('git@github.com:gridsome/gridsome.git')
  expect(node.fields.url4).toEqual('ftp://ftp.example.com')
  expect(node.fields.email).toEqual('email@example.com')
})

test('resolve absolute file paths with a custom path', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType({
    typeName: 'C',
    resolveAbsolutePaths: '/path/to/dir'
  })

  const node = contentType.addNode({
    fields: {
      file: '/image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.fields.file).toEqual('/path/to/dir/image.png')
})

test('don\'t touch absolute paths when resolveAbsolutePaths is not set', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType({ typeName: 'A' })

  const node = contentType.addNode({
    fields: {
      file: '/image.png',
      file2: 'image.png',
      file3: '../image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.fields.file).toEqual('/image.png')
  expect(node.fields.file2).toEqual('/absolute/dir/to/a/image.png')
  expect(node.fields.file3).toEqual('/absolute/dir/to/image.png')
})

test('always resolve relative paths from filesytem sources', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({ typeName: 'A' })

  const node = contentType.addNode({
    fields: {
      file: '../image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.fields.file).toEqual('/absolute/dir/to/image.png')
})

test('resolve paths from external sources', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType1 = api.store.addContentType({ typeName: 'A' })
  const contentType2 = api.store.addContentType({ typeName: 'B', resolveAbsolutePaths: true })

  const node1 = contentType1.addNode({
    fields: {
      file: '/image.png',
      file2: 'image.png',
      file3: '../../image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post'
    }
  })

  const node2 = contentType2.addNode({
    fields: {
      file: '/images/image.png',
      file2: 'images/image.png',
      file3: './images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/another-blog-post/'
    }
  })

  expect(node1.fields.file).toEqual('/image.png')
  expect(node1.fields.file2).toEqual('https://www.example.com/2018/11/02/image.png')
  expect(node1.fields.file3).toEqual('https://www.example.com/2018/image.png')
  expect(node2.fields.file).toEqual('https://www.example.com/images/image.png')
  expect(node2.fields.file2).toEqual('https://www.example.com/2018/11/02/another-blog-post/images/image.png')
  expect(node2.fields.file3).toEqual('https://www.example.com/2018/11/02/another-blog-post/images/image.png')
})

test('resolve paths from external sources with a custom url', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'A',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images'
  })

  const contentType2 = api.store.addContentType({
    typeName: 'B',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images/'
  })

  const node = contentType.addNode({
    fields: {
      file: '/image.png',
      file2: 'image.png',
      file3: '../image.png',
      file4: 'https://subdomain.example.com/images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  const node2 = contentType2.addNode({
    fields: {
      file: '/image.png',
      file2: 'image.png',
      file3: '../image.png',
      file4: 'https://subdomain.example.com/images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  expect(node.fields.file).toEqual('https://cdn.example.com/assets/image.png')
  expect(node.fields.file2).toEqual('https://www.example.com/2018/11/02/image.png')
  expect(node.fields.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node.fields.file4).toEqual('https://subdomain.example.com/images/image.png')
  expect(node2.fields.file).toEqual('https://cdn.example.com/assets/images/image.png')
  expect(node2.fields.file2).toEqual('https://www.example.com/2018/11/02/image.png')
  expect(node2.fields.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node2.fields.file4).toEqual('https://subdomain.example.com/images/image.png')
})

test('fail if transformer is not installed', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  expect(() => {
    contentType.addNode({
      internal: {
        mimeType: 'text/markdown',
        content: '# Test'
      }
    })
  }).toThrow('No transformer for text/markdown is installed')
})

test('generate slug from any string', () => {
  const api = createPlugin()

  const slug1 = api.store.slugify('Lorem ipsum dolor sit amet')
  const slug2 = api.store.slugify('String with æøå characters')
  const slug3 = api.store.slugify('String/with / slashes')
  const slug4 = api.store.slugify('  Trim  string   ')

  expect(slug1).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(slug2).toEqual('string-with-aeoa-characters')
  expect(slug3).toEqual('string-with-slashes')
  expect(slug4).toEqual('trim-string')
})

test('add page', () => {
  const api = createPlugin()

  const emit = jest.spyOn(api.store, 'emit')
  const page = api.store.addPage('page', {
    title: 'Lorem ipsum dolor sit amet',
    internal: { origin: 'Test.vue' }
  })

  expect(page).toHaveProperty('$loki')
  expect(page).toHaveProperty('pageQuery')
  expect(page.type).toEqual('page')
  expect(page.title).toEqual('Lorem ipsum dolor sit amet')
  expect(page.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(page.path).toEqual('/lorem-ipsum-dolor-sit-amet')
  expect(page.internal.origin).toEqual('Test.vue')
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('add page with query', () => {
  const api = createPlugin()

  const page = api.store.addPage('page', {
    pageQuery: {
      content: 'query Test { page { id } }',
      options: {
        foo: 'bar'
      }
    }
  })

  expect(typeof page.pageQuery.query).toEqual('object')
  expect(page.pageQuery.content).toEqual('query Test { page { id } }')
  expect(page.pageQuery.options).toMatchObject({ foo: 'bar' })
  expect(page.pageQuery.paginate).toMatchObject({
    collection: undefined,
    perPage: undefined
  })
})

test('update page', () => {
  const api = createPlugin()

  api.store.addPage('page', {
    id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    internal: { origin: 'Test.vue' }
  })

  const emit = jest.spyOn(api.store, 'emit')
  const page = api.store.updatePage('test', {
    internal: { origin: 'Test2.vue' },
    title: 'New title'
  })

  expect(page.title).toEqual('New title')
  expect(page.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(page.path).toEqual('/lorem-ipsum-dolor-sit-amet')
  expect(page.internal.origin).toEqual('Test2.vue')
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('update page path when slug is changed', () => {
  const api = createPlugin()

  api.store.addPage('page', { id: 'test' })

  const page = api.store.updatePage('test', {
    slug: 'new-title'
  })

  expect(page.title).toEqual('test')
  expect(page.slug).toEqual('new-title')
  expect(page.path).toEqual('/new-title')
})

test('remove page', () => {
  const api = createPlugin()

  const emit = jest.spyOn(api.store, 'emit')

  api.store.addPage('page', { id: 'test' })
  api.store.removePage('test')

  expect(api.store.getPage('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})
