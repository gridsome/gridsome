const App = require('../App')
const PluginAPI = require('../PluginAPI')
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
    typeName: 'TestPost',
    route: '/path/:id/:bar/:foo_raw/(.*)?'
  })

  expect(contentType.typeName).toEqual('TestPost')
  expect(contentType.route).toBeUndefined()
  expect(contentType.options.refs).toMatchObject({})
  expect(contentType.options.fields).toMatchObject({})
  expect(contentType.options.belongsTo).toMatchObject({})
  expect(contentType.options.routeKeys[0]).toMatchObject({ name: 'id', path: ['id'], fieldName: 'id', repeat: false })
  expect(contentType.options.routeKeys[1]).toMatchObject({ name: 'bar', path: ['fields', 'bar'], fieldName: 'bar', repeat: false })
  expect(contentType.options.routeKeys[2]).toMatchObject({ name: 'foo_raw', path: ['fields', 'foo'], fieldName: 'foo', repeat: false })
  expect(contentType.options.resolveAbsolutePaths).toEqual(false)

  expect(contentType.addNode).toBeInstanceOf(Function)
  expect(contentType.updateNode).toBeInstanceOf(Function)
  expect(contentType.removeNode).toBeInstanceOf(Function)
  expect(contentType.addReference).toBeInstanceOf(Function)
  expect(contentType.addSchemaField).toBeInstanceOf(Function)
  expect(contentType.makeUid).toBeInstanceOf(Function)
  expect(contentType.slugify).toBeInstanceOf(Function)
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
    route: '/test/:foo/:slug'
  })

  const emit = jest.spyOn(contentType, 'emit')

  const oldNode = contentType.addNode({
    id: 'test',
    date: '2018-09-04T23:20:33.918Z',
    content: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum...',
    fields: {
      foo: 'bar'
    }
  })

  const oldTimestamp = oldNode.internal.timestamp
  const uid = oldNode.uid

  const node = contentType.updateNode({
    id: 'test',
    title: 'New title',
    content: 'Praesent commodo cursus magna',
    excerpt: 'Praesent commodo...',
    fields: {
      foo: 'foo'
    }
  })

  const entry = api.store.store.index.findOne({ uid: node.uid })

  expect(node.id).toEqual('test')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('New title')
  expect(node.slug).toEqual('new-title')
  expect(node.path).toEqual('/test/foo/new-title')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.content).toEqual('Praesent commodo cursus magna')
  expect(node.excerpt).toEqual('Praesent commodo...')
  expect(node.fields.foo).toEqual('foo')
  expect(node.internal.timestamp).not.toEqual(oldTimestamp)
  expect(emit).toHaveBeenCalledTimes(2)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(uid)
  expect(entry.path).toEqual('/test/foo/new-title')

  emit.mockRestore()
})

test('change node id', () => {
  const { store } = createPlugin()

  const uid = 'test'
  const contentType = store.addContentType({ typeName: 'TestPost' })

  const node1 = contentType.addNode({ uid, id: 'test' })

  expect(node1.id).toEqual('test')

  const node2 = contentType.updateNode({ uid, id: 'test-2' })
  const entry = store.store.index.findOne({ uid })

  expect(node2.id).toEqual('test-2')
  expect(node2.uid).toEqual('test')
  expect(entry.uid).toEqual('test')
})

test('change node id from fields', () => {
  const { store } = createPlugin()

  const uid = 'test'
  const contentType = store.addContentType({ typeName: 'TestPost' })

  const node1 = contentType.addNode({ uid, fields: { id: 'test' }})

  expect(node1.id).toEqual('test')

  const node2 = contentType.updateNode({ uid, fields: { id: 'test-2' }})
  const entry = store.store.index.findOne({ uid })

  expect(node2.id).toEqual('test-2')
  expect(node2.uid).toEqual('test')
  expect(entry.uid).toEqual('test')
})

test('prioritize node.id over node.fields.id', () => {
  const contentType = createPlugin().store.addContentType('Test')

  const node = contentType.addNode({
    id: 'foo',
    fields: {
      id: 'bar'
    }
  })

  expect(node.id).toEqual('foo')
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
      number: 24,
      tags: ['Node.js'],
      filename: 'image.png'
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
  expect(node.fields.tags[0]).toEqual('Node.js')
  expect(node.fields.filename).toEqual('image.png')
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

test('add nodes with custom paths', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost'
  })

  const node1 = contentType.addNode({ path: '/lorem-ipsum-dolor-sit-amet' })
  const node2 = contentType.addNode({ path: 'nibh-fermentum-fringilla' })

  expect(contentType.options.route).toBeUndefined()
  expect(node1.path).toEqual('/lorem-ipsum-dolor-sit-amet')
  expect(node2.path).toEqual('/nibh-fermentum-fringilla')
})

test('add type with dynamic route', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route: '/:year/:month/:day/:slug'
  })

  const node = contentType.addNode({
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(contentType.options.route).toEqual('/:year/:month/:day/:slug')
  expect(node.path).toEqual('/2018/09/04/lorem-ipsum-dolor-sit-amet')
})

test('prefix dynamic route with leading slash', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost2',
    route: 'blog/:slug'
  })

  const node = contentType.addNode({
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(contentType.options.route).toEqual('/blog/:slug')
  expect(node.path).toEqual('/blog/lorem-ipsum-dolor-sit-amet')
})

test('add type with custom fields in route', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route: '/:test/:test_raw/:id/:numeric/:author/:genre__name/:arr__1/:missing/:slug'
  })

  const node = contentType.addNode({
    id: '1234',
    title: 'Lorem ipsum',
    fields: {
      test: 'My value',
      genre: {
        popularity: 0.8,
        name: 'Thriller'
      },
      arr: [0, 1, 2],
      numeric: 10,
      author: {
        typeName: 'Author',
        id: '2'
      }
    }
  })

  expect(node.path).toEqual('/my-value/My%20value/1234/10/2/thriller/1/missing/lorem-ipsum')
})

test('deeply nested field starting with `raw`', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route: '/:foo__rawValue'
  })

  const node = contentType.addNode({
    fields: {
      foo: {
        rawValue: 'BAR'
      }
    }
  })

  expect(node.path).toEqual('/bar')
})

test('raw version of deeply nested field starting with `raw`', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route: '/:foo__rawValue_raw'
  })

  const node = contentType.addNode({
    fields: {
      foo: {
        rawValue: 'BAR'
      }
    }
  })

  expect(node.path).toEqual('/BAR')
})

test.each([
  [
    '/:segments+',
    { segments: ['this', 'should be', 'SLUGIFIED'] },
    '/this/should-be/slugified'
  ],
  [
    '/:segments_raw+',
    { segments: ['this', 'should not be', 'SLUGIFIED'] },
    '/this/should%20not%20be/SLUGIFIED'
  ],
  [
    '/path/:optionalSegments*',
    { optionalSegments: [] },
    '/path'
  ],
  [
    '/:segments+',
    { segments: 'this works too' },
    '/this-works-too'
  ],
  [
    '/:before*/c/:after*',
    { before: ['a', 'b'], after: ['d'] },
    '/a/b/c/d'
  ],
  [
    '/blog/:tags*',
    { tags: [{ typeName: 'Tag', id: 1 }, { typeName: 'Tag', id: 2 }] },
    '/blog/1/2'
  ],
  [
    '/:mixed_raw+/:mixed+',
    { mixed: [{ typeName: 'Thing', id: 42 }, '&&&', { thisIs: 'ignored' }] },
    '/42/%26%26%26/42/and-and-and'
  ],
  [
    '/this-is/:notRepeated',
    { notRepeated: ['a', 'b', 'c'] },
    '/this-is/a-b-c'
  ],
  [
    '/path/:segments_raw',
    { segments: ['a', 'b', 'c'] },
    '/path/a%2Cb%2Cc'
  ]
])('dynamic route with repeated segments', (route, fields, path) => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route
  })

  const node = contentType.addNode({ fields })

  expect(node.path).toEqual(path)
})

test('dynamic route with non-optional repeated segments', () => {
  const contentType = createPlugin().store.addContentType({
    typeName: 'TestPost',
    route: '/path/:segments+'
  })

  expect(() => contentType.addNode({
    fields: {
      segments: []
    }
  })).toThrow(TypeError, 'Expected "segments" to not be empty')
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

test('resolve file paths', () => {
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
      path: 'dir/to/image.png',
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

  expect(node.fields.file).toEqual('image.png')
  expect(node.fields.file2).toEqual('/absolute/dir/to/project/image.png')
  expect(node.fields.file3).toEqual('/absolute/dir/to/image.png')
  expect(node.fields.path).toEqual('dir/to/image.png')
  expect(node.fields.url).toEqual('https://example.com/image.jpg')
  expect(node.fields.url2).toEqual('//example.com/image.jpg')
  expect(node.fields.url3).toEqual('git@github.com:gridsome/gridsome.git')
  expect(node.fields.url4).toEqual('ftp://ftp.example.com')
  expect(node.fields.email).toEqual('email@example.com')
  expect(node.fields.text).toEqual('Lorem ipsum dolor sit amet.')
  expect(node.fields.text2).toEqual('example.com')
  expect(node.fields.text3).toEqual('md')
})

test('resolve absolute file paths with no origin', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType({
    typeName: 'Test',
    resolveAbsolutePaths: true
  })

  const node = contentType.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png'
    }
  })

  expect(node.fields.file).toEqual('image.png')
  expect(node.fields.file2).toEqual('/absolute/dir/to/project/image.png')
})

test('resolve absolute file paths with a custom path', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType({
    typeName: 'C',
    resolveAbsolutePaths: '/path/to/dir'
  })

  const node1 = contentType.addNode({
    fields: {
      file: '/image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  const node2 = contentType.addNode({
    fields: {
      file: '/image.png'
    }
  })

  expect(node1.fields.file).toEqual('/path/to/dir/image.png')
  expect(node2.fields.file).toEqual('/path/to/dir/image.png')
})

test('don\'t touch absolute paths when resolveAbsolutePaths is not set', () => {
  const api = createPlugin('/absolute/dir/to/project')

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

test('dont resolve relative paths when no origin', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({ typeName: 'A' })

  const node = contentType.addNode({
    fields: {
      file: '../image.png'
    }
  })

  expect(node.fields.file).toEqual('../image.png')
})

test('resolve relative paths from external sources', () => {
  const api = createPlugin()

  const contentType1 = api.store.addContentType({ typeName: 'A' })

  const node = contentType1.addNode({
    fields: {
      filename: 'image.png',
      file2: '/image.png',
      file3: '../../image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post'
    }
  })

  expect(node.fields.filename).toEqual('image.png')
  expect(node.fields.file2).toEqual('/image.png')
  expect(node.fields.file3).toEqual('https://www.example.com/2018/image.png')
})

test('resolve absolute paths from external sources', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType2 = api.store.addContentType({
    typeName: 'B',
    resolveAbsolutePaths: true
  })

  const node3 = contentType2.addNode({
    fields: {
      path: 'images/image.png',
      file2: '/images/image.png',
      file3: './images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/another-blog-post/'
    }
  })

  expect(node3.fields.path).toEqual('images/image.png')
  expect(node3.fields.file2).toEqual('https://www.example.com/images/image.png')
  expect(node3.fields.file3).toEqual('https://www.example.com/2018/11/02/another-blog-post/images/image.png')
})

test('resolve paths from external sources with a custom url', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'A',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images'
  })

  const node = contentType.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../image.png',
      file4: 'https://subdomain.example.com/images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  expect(node.fields.file).toEqual('image.png')
  expect(node.fields.file2).toEqual('https://cdn.example.com/assets/image.png')
  expect(node.fields.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node.fields.file4).toEqual('https://subdomain.example.com/images/image.png')

  const contentType2 = api.store.addContentType({
    typeName: 'B',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images/'
  })

  const node2 = contentType2.addNode({
    fields: {
      file: 'image.png',
      file2: '/image.png',
      file3: '../image.png',
      file4: 'https://subdomain.example.com/images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  expect(node2.fields.file).toEqual('image.png')
  expect(node2.fields.file2).toEqual('https://cdn.example.com/assets/images/image.png')
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
    pageQuery: 'query Test { page { id } }'
  })

  expect(page.pageQuery.query).toEqual('query Test { page { id } }')
  expect(page.pageQuery.paginate).toEqual(false)
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
