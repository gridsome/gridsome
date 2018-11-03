const App = require('../lib/app/App')
const PluginAPI = require('../lib/app/PluginAPI')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

let app, api

beforeEach(() => {
  app = new App('/', { config: { plugins: [] }}).init()
  api = new PluginAPI(app, {
    entry: { options: {}, clientOptions: undefined },
    transformers: {
      'application/json': {
        TransformerClass: JSONTransformer,
        options: {},
        name: 'json'
      }
    }
  })
})

afterAll(() => {
  app = null
  api = null
})

test('add type', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  expect(contentType.typeName).toEqual('TestPost')
  expect(contentType.route).toBeUndefined()
  expect(typeof contentType.makePath).toBe('function')
})

test('add node', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const emit = jest.spyOn(contentType, 'emit')
  const node = contentType.addNode({
    _id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(node).toHaveProperty('$loki')
  expect(node._id).toEqual('test')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('Lorem ipsum dolor sit amet')
  expect(node.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.fields).toMatchObject({})
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('update node', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const emit = jest.spyOn(contentType, 'emit')

  const oldNode = contentType.addNode({
    _id: 'test',
    date: '2018-09-04T23:20:33.918Z'
  })

  const oldTimestamp = oldNode.internal.timestamp

  const node = contentType.updateNode('test', {
    title: 'New title'
  })

  expect(node._id).toEqual('test')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('New title')
  expect(node.slug).toEqual('new-title')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.internal.timestamp).not.toEqual(oldTimestamp)
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('remove node', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const emit = jest.spyOn(contentType, 'emit')

  contentType.addNode({ _id: 'test' })
  contentType.removeNode('test')

  expect(contentType.getNode('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('add type with ref', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: '_id',
        typeName: 'TestAuthor'
      }
    }
  })

  expect(contentType.options.refs.author).toMatchObject({
    key: '_id',
    fieldName: 'author',
    typeName: 'TestAuthor',
    description: 'Reference to TestAuthor'
  })
})

test('add type with dynamic route', () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    route: ':year/:month/:day/:slug'
  })

  const node = contentType.addNode({
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(contentType.options.route).toEqual(':year/:month/:day/:slug')
  expect(node.path).toEqual('2018/09/05/lorem-ipsum-dolor-sit-amet')
})

test('transform node', () => {
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
  const contentType1 = api.store.addContentType({ typeName: 'A', fileBasePath: 'file' })
  const contentType2 = api.store.addContentType({ typeName: 'B', fileBasePath: 'root' })
  const contentType3 = api.store.addContentType({ typeName: 'C', fileBasePath: '/path/to/dir' })

  const node1 = contentType1.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../image.png',
      image: 'https://example.com/image.jpg',
      image2: '//example.com/image.jpg',
      text: 'Lorem ipsum dolor sit amet.',
      text2: 'example.com'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  const node2 = contentType2.addNode({
    fields: {
      file: '/image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  const node3 = contentType3.addNode({
    fields: {
      file: '/image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node1.fields.file).toEqual('/absolute/dir/to/a/image.png')
  expect(node1.fields.file2).toEqual('/absolute/dir/to/a/image.png')
  expect(node1.fields.file3).toEqual('/absolute/dir/to/image.png')
  expect(node1.fields.text).toEqual('Lorem ipsum dolor sit amet.')
  expect(node1.fields.text2).toEqual('example.com')
  expect(node1.fields.image).toEqual('https://example.com/image.jpg')
  expect(node1.fields.image2).toEqual('//example.com/image.jpg')
  expect(node2.fields.file).toEqual('/image.png')
  expect(node3.fields.file).toEqual('/path/to/dir/image.png')
})

test('don\'t touch paths when fileBasePath is not set', () => {
  const contentType = api.store.addContentType({ typeName: 'A' })

  const node = contentType.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.fields.file).toEqual('image.png')
  expect(node.fields.file2).toEqual('/image.png')
  expect(node.fields.file3).toEqual('/absolute/dir/to/image.png')
})

test('always resolve relative paths from filesytem sources', () => {
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
  const contentType1 = api.store.addContentType({
    typeName: 'A',
    fileBasePath: 'path'
  })

  const contentType2 = api.store.addContentType({
    typeName: 'B',
    fileBasePath: 'host'
  })

  const node1 = contentType1.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../../image.png'
    },
    internal: {
      origin: 'https://example.com/2018/11/02/blog-post.html'
    }
  })

  const node2 = contentType2.addNode({
    fields: {
      file: 'images/image.png',
      file2: '/images/image.png',
      file3: './images/image.png'
    },
    internal: {
      origin: 'https://example.com/2018/11/02/another-blog-post/'
    }
  })

  expect(node1.fields.file).toEqual('https://example.com/2018/11/02/image.png')
  expect(node1.fields.file2).toEqual('https://example.com/2018/11/02/image.png')
  expect(node1.fields.file3).toEqual('https://example.com/2018/image.png')
  expect(node2.fields.file).toEqual('https://example.com/images/image.png')
  expect(node2.fields.file2).toEqual('https://example.com/images/image.png')
  expect(node2.fields.file3).toEqual('https://example.com/images/image.png')
})

test('fail if transformer is not installed', () => {
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
  const page = api.store.addPage('page', {
    pageQuery: {
      content: 'query Test { page { _id } }',
      options: {
        foo: 'bar'
      }
    }
  })

  expect(typeof page.pageQuery.query).toEqual('object')
  expect(page.pageQuery.content).toEqual('query Test { page { _id } }')
  expect(page.pageQuery.options).toMatchObject({ foo: 'bar' })
  expect(page.pageQuery.paginate).toMatchObject({
    collection: undefined,
    perPage: undefined
  })
})

test('update page', () => {
  api.store.addPage('page', {
    _id: 'test',
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
  api.store.addPage('page', { _id: 'test' })

  const page = api.store.updatePage('test', {
    slug: 'new-title'
  })

  expect(page.title).toEqual('test')
  expect(page.slug).toEqual('new-title')
  expect(page.path).toEqual('/new-title')
})

test('remove page', () => {
  const emit = jest.spyOn(api.store, 'emit')

  api.store.addPage('page', { _id: 'test' })
  api.store.removePage('test')

  expect(api.store.getPage('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})
