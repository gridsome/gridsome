const path = require('path')
const App = require('../../app/App')
const PluginAPI = require('../../app/PluginAPI')
const JSONTransformer = require('./__fixtures__/JSONTransformer')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

async function createPlugin (cwd = '/', localConfig) {
  const context = path.resolve(cwd)
  const app = await new App(context, { localConfig }).init()
  const api = new PluginAPI(app, {
    entry: {
      use: 'test-plugin',
      name: 'test-plugin',
      options: {},
      clientOptions: undefined
    },
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

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}

test('add collection', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/path/:id/:bar/:foo_raw/(.*)?'
  })

  expect(collection.typeName).toEqual('TestPost')
  expect(collection.route).toBeUndefined()
  expect(collection._refs).toMatchObject({})
  expect(collection._fields).toMatchObject({})
  expect(collection._resolveAbsolutePaths).toEqual(false)

  expect(collection.addNode).toBeInstanceOf(Function)
  expect(collection.updateNode).toBeInstanceOf(Function)
  expect(collection.removeNode).toBeInstanceOf(Function)
  expect(collection.addReference).toBeInstanceOf(Function)
  expect(collection.addSchemaField).toBeInstanceOf(Function)
  expect(collection.makeUid).toBeInstanceOf(Function)
  expect(collection.slugify).toBeInstanceOf(Function)
})

test('add node', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  const emit = jest.spyOn(collection._events, 'emit')
  const node = collection.addNode({
    id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z',
    customField: true
  })

  const entry = api.store.store.nodeIndex.getEntry(node.$uid)

  expect(node).toHaveProperty('$loki')
  expect(node.id).toEqual('test')
  expect(typeof node.$uid).toEqual('string')
  expect(node.internal.typeName).toEqual('TestPost')
  expect(node.title).toEqual('Lorem ipsum dolor sit amet')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.customField).toEqual(true)
  expect(emit).toHaveBeenCalledTimes(1)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(node.$uid)
  expect(entry.typeName).toEqual('TestPost')

  emit.mockRestore()
})

test('update node', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/test/:foo/:slug'
  })

  const emit = jest.spyOn(collection._events, 'emit')

  const oldNode = collection.addNode({
    id: 'test',
    slug: 'test',
    date: '2018-09-04T23:20:33.918Z',
    content: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum...',
    foo: 'bar'
  })

  const uid = oldNode.$uid

  const node = collection.updateNode({
    id: 'test',
    title: 'New title',
    slug: 'new-title',
    content: 'Praesent commodo cursus magna',
    excerpt: 'Praesent commodo...',
    foo: 'foo'
  })

  const entry = api.store.store.nodeIndex.getEntry(node.$uid)

  expect(node.id).toEqual('test')
  expect(node.title).toEqual('New title')
  expect(node.slug).toEqual('new-title')
  expect(node.path).toEqual('/test/foo/new-title/')
  expect(node.content).toEqual('Praesent commodo cursus magna')
  expect(node.excerpt).toEqual('Praesent commodo...')
  expect(node.foo).toEqual('foo')
  expect(node.internal.typeName).toEqual('TestPost')
  expect(emit).toHaveBeenCalledTimes(2)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(uid)
  expect(node.date).toBeUndefined()

  emit.mockRestore()
})

test('change node id', async () => {
  const { store } = await createPlugin()

  const uid = 'test'
  const collection = store.addCollection({ typeName: 'TestPost' })

  const node1 = collection.addNode({ $uid: uid, id: 'test' })

  expect(node1.id).toEqual('test')

  const node2 = collection.updateNode({ $uid: uid, id: 'test-2' })
  const entry = store.store.nodeIndex.getEntry(uid)

  expect(node2.id).toEqual('test-2')
  expect(node2.$uid).toEqual('test')
  expect(entry.uid).toEqual('test')
})

test('get node by id', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  collection.addNode({ id: 'test' })

  expect(collection.getNode('test').id).toEqual('test')
})

test('get node by uid', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  collection.addNode({ $uid: 'foo', id: '1' })

  expect(api.store.getNodeByUid('foo').id).toEqual('1')
})

test('find node', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  collection.addNode({ id: 'test' })

  expect(collection.findNode({ id: 'test' }).id).toEqual('test')
})

test('find many nodes', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  collection.addNode({ id: '1', value: 1 })
  collection.addNode({ id: '2', value: 2 })
  collection.addNode({ id: '3', value: 3 })

  expect(collection.findNodes({ value: { $gt: 1 }})).toHaveLength(2)
})

test('get all nodes', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  collection.addNode({ id: '1' })
  collection.addNode({ id: '2' })
  collection.addNode({ id: '3' })

  expect(collection.data()).toHaveLength(3)
})

test('remove node', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  const emit = jest.spyOn(collection._events, 'emit')
  const node = collection.addNode({ id: 'test' })

  collection.removeNode('test')

  const entry = api.store.store.nodeIndex.getEntry(node.$uid)

  expect(collection.getNode('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)
  expect(entry).toBeNull()

  emit.mockRestore()
})

test('add nodes with custom fields', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection('TestPost')

  const node = collection.addNode({
    title: 'Lorem ipsum',
    nullValue: null,
    undefinedValue: undefined,
    falseValue: false,
    test: 'My value',
    list: ['1', '2', '3'],
    objectList: [{ test: 1 }, { test: 2 }],
    number: 24,
    tags: ['Node.js'],
    filename: 'image.png'
  })

  expect(node.test).toEqual('My value')
  expect(node.nullValue).toEqual(null)
  expect(node.undefinedValue).toEqual(undefined)
  expect(node.falseValue).toEqual(false)
  expect(node.list).toHaveLength(3)
  expect(node.objectList).toHaveLength(2)
  expect(node.objectList[0]).toMatchObject({ test: 1 })
  expect(node.objectList[1]).toMatchObject({ test: 2 })
  expect(node.number).toEqual(24)
  expect(node.tags[0]).toEqual('Node.js')
  expect(node.filename).toEqual('image.png')
})

test('add type with ref', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  expect(collection._refs.author).toMatchObject({
    typeName: 'TestAuthor',
    fieldName: 'author'
  })
})

test('add type with dynamic route', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/:year/:month/:day/:title'
  })

  const node = collection.addNode({
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(collection.options.route).toEqual('/:year/:month/:day/:title')
  expect(node.path).toEqual('/2018/09/04/lorem-ipsum-dolor-sit-amet/')
})

test('add type with custom fields in route', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/:test/:test_raw/:id/:numeric/:author/:genre__name/:arr__1/:missing/:title'
  })

  const node = collection.addNode({
    id: 'abcDef',
    title: 'Lorem ipsum',
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
  })

  expect(node.path).toEqual('/my-value/My%20value/abcDef/10/2/thriller/1/missing/lorem-ipsum/')
})

// TODO: the path field should be a schema field instead
test('set collection template with config', async () => {
  const api = await createPlugin('/', {
    templates: {
      Post: '/blog/:id'
    }
  })

  const collection = api.store.addCollection('Post')
  const node = collection.addNode({ id: '1' })

  expect(node.path).toEqual('/blog/1/')
})

test('generate path with function', async () => {
  const api = await createPlugin(undefined, {
    templates: {
      Post: node => `${node.path}/`
    }
  })

  const collection = api.store.addCollection('Post')
  const node = collection.addNode({ path: '/some/path' })

  expect(node.path).toEqual('/some/path/')
})

test('preserve trailing slash in paths from function', async () => {
  const api = await createPlugin(undefined, {
    permalinks: {
      trailingSlash: false
    },
    templates: {
      Post: node => `${node.path}/`
    }
  })

  const collection = api.store.addCollection('Post')
  const node = collection.addNode({ path: '/some/path' })

  expect(node.path).toEqual('/some/path/')
})

test('preserve trailing slash in routes', async () => {
  const api = await createPlugin(undefined, {
    permalinks: {
      trailingSlash: false
    },
    templates: {
      Post: '/path/:id/'
    }
  })

  const collection = api.store.addCollection('Post')
  const node = collection.addNode({ id: '1' })

  expect(node.path).toEqual('/path/1/')
})

test('don\'t add trailing slash for template paths', async () => {
  const api = await createPlugin(undefined, {
    permalinks: {
      trailingSlash: false
    },
    templates: {
      Post: '/path/:id',
      Author: node => node.path
    }
  })

  const post = api.store.addCollection('Post').addNode({ id: '1' })
  const author = api.store.addCollection('Author').addNode({ path: '/test' })

  expect(post.path).toEqual('/path/1')
  expect(author.path).toEqual('/test')
})

// TODO: move dateField and route options to global permalinks config
test('set custom date field name for collection', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    dateField: 'published_at',
    route: '/:year/:month/:day/:slug'
  })

  const node = collection.addNode({
    id: '1',
    slug: 'my-post',
    published_at: '2019-05-19'
  })

  expect(node.path).toEqual('/2019/05/19/my-post/')
})

test('set custom year, month and day fields', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/:year/:month/:day/:slug'
  })

  const node = collection.addNode({
    id: '1',
    slug: 'my-post',
    date: '2019-05-19',
    year: 'Twenty Nighteen',
    month: 'May',
    day: 'Nighteen'
  })

  expect(node.path).toEqual('/twenty-nighteen/may/nighteen/my-post/')
})

test('deeply nested field starting with `raw`', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/:foo__rawValue'
  })

  const node = collection.addNode({
    foo: {
      rawValue: 'BAR'
    }
  })

  expect(node.path).toEqual('/bar/')
})

test('raw version of deeply nested field starting with `raw`', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/:foo__rawValue_raw'
  })

  const node = collection.addNode({
    foo: {
      rawValue: 'BAR'
    }
  })

  expect(node.path).toEqual('/BAR/')
})

test.each([
  [
    '/:segments+',
    { segments: ['this', 'should be', 'SLUGIFIED'] },
    '/this/should-be/slugified/'
  ],
  [
    '/:segments_raw+',
    { segments: ['this', 'should not be', 'SLUGIFIED'] },
    '/this/should%20not%20be/SLUGIFIED/'
  ],
  [
    '/path/:optionalSegments*',
    { optionalSegments: [] },
    '/path/'
  ],
  [
    '/:segments+',
    { segments: 'this works too' },
    '/this-works-too/'
  ],
  [
    '/:before*/c/:after*',
    { before: ['a', 'b'], after: ['d'] },
    '/a/b/c/d/'
  ],
  [
    '/blog/:tags*',
    { tags: [{ typeName: 'Tag', id: 1 }, { typeName: 'Tag', id: 2 }] },
    '/blog/1/2/'
  ],
  [
    '/:mixed_raw+/:mixed+',
    { mixed: [{ typeName: 'Thing', id: 42 }, '&&&', { thisIs: 'ignored' }] },
    '/42/%26%26%26/42/and-and-and/'
  ],
  [
    '/this-is/:notRepeated',
    { notRepeated: ['a', 'b', 'c'] },
    '/this-is/a-b-c/'
  ],
  [
    '/path/:segments_raw',
    { segments: ['a', 'b', 'c'] },
    '/path/a%2Cb%2Cc/'
  ]
])('dynamic route with repeated segments', async (route, options, path) => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route
  })

  const node = collection.addNode(options)

  expect(node.path).toEqual(path)
})

test('custom slugify function', async () => {
  const api = await createPlugin(undefined, {
    permalinks: {
      slugify: () => 'foo_bar'
    }
  })

  const collection = api.store.addCollection({
    typeName: 'Post',
    route: '/path/:title'
  })

  const node = collection.addNode({ title: 'FooBar' })

  expect(node.path).toEqual('/path/foo_bar/')
})

test('disable slugify', async () => {
  const api = await createPlugin(undefined, {
    permalinks: {
      slugify: false
    },
    templates: {
      Post: '/path/:title'
    }
  })

  const collection = api.store.addCollection('Post')
  const node = collection.addNode({ title: 'FooBar' })

  expect(node.path).toEqual('/path/FooBar/')
})

test('dynamic route with non-optional repeated segments', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    route: '/path/:segments+'
  })

  expect(() => collection.addNode({
    segments: []
  })).toThrow(TypeError, 'Expected "segments" to not be empty')
})

test('transform node', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection('TestPost')

  const node = collection.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      content: JSON.stringify({ id: '2', foo: 'bar' })
    }
  })

  expect(node).toMatchObject({ id: '2', foo: 'bar' })
})

test('resolve file paths', async () => {
  const api = await createPlugin('/absolute/dir/to/project')

  const collection = api.store.addCollection({
    typeName: 'Test',
    resolveAbsolutePaths: true
  })

  const node = collection.addNode({
    file: 'image.png',
    file2: '/image.png',
    file3: '../image.png',
    filepath: 'dir/to/image.png',
    url: 'https://example.com/image.jpg',
    url2: '//example.com/image.jpg',
    url3: 'git@github.com:gridsome/gridsome.git',
    url4: 'ftp://ftp.example.com',
    email: 'email@example.com',
    email2: 'mailto:email@example.me',
    text: 'Lorem ipsum dolor sit amet.',
    text2: 'example.com',
    text3: 'md',
    internal: {
      origin: path.resolve('/absolute/dir/to/a/file.md')
    }
  })

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual(path.resolve('/absolute/dir/to/project/image.png'))
  expect(node.file3).toEqual(path.resolve('/absolute/dir/to/image.png'))
  expect(node.filepath).toEqual('dir/to/image.png')
  expect(node.url).toEqual('https://example.com/image.jpg')
  expect(node.url2).toEqual('//example.com/image.jpg')
  expect(node.url3).toEqual('git@github.com:gridsome/gridsome.git')
  expect(node.url4).toEqual('ftp://ftp.example.com')
  expect(node.email).toEqual('email@example.com')
  expect(node.email2).toEqual('mailto:email@example.me')
  expect(node.text).toEqual('Lorem ipsum dolor sit amet.')
  expect(node.text2).toEqual('example.com')
  expect(node.text3).toEqual('md')
})

test('resolve file paths when folder as extension', async () => {
  const api = await createPlugin('/absolute/dir/to/project.com')

  const collection = api.store.addCollection({
    typeName: 'Test',
    resolveAbsolutePaths: true
  })

  const node = collection.addNode({
    file: 'image.png',
    file2: '/image.png',
    file3: '../image.png',
    filepath: 'dir/to/image.png',
    internal: {
      origin: '/absolute/dir/to/project.com/a/b/file.md'
    }
  })

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('/absolute/dir/to/project.com/image.png')
  expect(node.file3).toEqual('/absolute/dir/to/project.com/a/image.png')
  expect(node.filepath).toEqual('dir/to/image.png')
})

test('resolve absolute file paths with no origin', async () => {
  const api = await createPlugin('/absolute/dir/to/project')

  const collection = api.store.addCollection({
    typeName: 'Test',
    resolveAbsolutePaths: true
  })

  const node = collection.addNode({
    file: 'image.png',
    file2: '/image.png'
  })

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual(
    path.resolve('/absolute/dir/to/project/image.png')
  )
})

test('resolve absolute file paths with a custom path', async () => {
  const api = await createPlugin('/absolute/dir/to/project')

  const collection = api.store.addCollection({
    typeName: 'C',
    resolveAbsolutePaths: path.resolve('/path/to/dir')
  })

  const node1 = collection.addNode({
    file: '/image.png',
    internal: {
      origin: path.resolve('/absolute/dir/to/a/file.md')
    }
  })

  const node2 = collection.addNode({
    file: '/image.png'
  })

  const expected = path.resolve('/path/to/dir/image.png')
  expect(node1.file).toEqual(expected)
  expect(node2.file).toEqual(expected)
})

test('don\'t touch absolute paths when resolveAbsolutePaths is not set', async () => {
  const api = await createPlugin('/absolute/dir/to/project')

  const collection = api.store.addCollection({ typeName: 'A' })

  const node = collection.addNode({
    file: 'image.png',
    file2: '/image.png',
    file3: '../image.png',
    internal: {
      origin: path.resolve('/absolute/dir/to/a/file.md')
    }
  })

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('/image.png')
  expect(node.file3).toEqual(path.resolve('/absolute/dir/to/image.png'))
})

test('always resolve relative paths from filesystem sources', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({ typeName: 'A' })

  const node = collection.addNode({
    file: '../image.png',
    internal: {
      origin: path.resolve('/absolute/dir/to/a/file.md')
    }
  })

  expect(node.file).toEqual(
    path.resolve('/absolute/dir/to/image.png')
  )
})

test('dont resolve relative paths when no origin', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({ typeName: 'A' })

  const node = collection.addNode({
    file: '../image.png'
  })

  expect(node.file).toEqual('../image.png')
})

test('resolve relative paths from external sources', async () => {
  const api = await createPlugin()

  const collection1 = api.store.addCollection({ typeName: 'A' })

  const node = collection1.addNode({
    filename: 'image.png',
    file2: '/image.png',
    file3: '../../image.png',
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post'
    }
  })

  expect(node.filename).toEqual('image.png')
  expect(node.file2).toEqual('/image.png')
  expect(node.file3).toEqual('https://www.example.com/2018/image.png')
})

test('resolve absolute paths from external sources', async () => {
  const api = await createPlugin('/absolute/dir/to/project')

  const collection2 = api.store.addCollection({
    typeName: 'B',
    resolveAbsolutePaths: true
  })

  const node3 = collection2.addNode({
    imagepath: 'images/image.png',
    file2: '/images/image.png',
    file3: './images/image.png',
    internal: {
      origin: 'https://www.example.com/2018/11/02/another-blog-post/'
    }
  })

  expect(node3.imagepath).toEqual('images/image.png')
  expect(node3.file2).toEqual('https://www.example.com/images/image.png')
  expect(node3.file3).toEqual('https://www.example.com/2018/11/02/another-blog-post/images/image.png')
})

test('resolve paths from external sources with a custom url', async () => {
  const api = await createPlugin()

  const collection = api.store.addCollection({
    typeName: 'A',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images'
  })

  const node = collection.addNode({
    file: 'image.png',
    file2: '/image.png',
    file3: '../image.png',
    file4: 'https://subdomain.example.com/images/image.png',
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('https://cdn.example.com/assets/image.png')
  expect(node.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node.file4).toEqual('https://subdomain.example.com/images/image.png')

  const collection2 = api.store.addCollection({
    typeName: 'B',
    resolveAbsolutePaths: 'https://cdn.example.com/assets/images/'
  })

  const node2 = collection2.addNode({
    file: 'image.png',
    file2: '/image.png',
    file3: '../image.png',
    file4: 'https://subdomain.example.com/images/image.png',
    internal: {
      origin: 'https://www.example.com/2018/11/02/blog-post.html'
    }
  })

  expect(node2.file).toEqual('image.png')
  expect(node2.file2).toEqual('https://cdn.example.com/assets/images/image.png')
  expect(node2.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node2.file4).toEqual('https://subdomain.example.com/images/image.png')
})

test('fail if transformer is not installed', async () => {
  const api = await createPlugin()
  const collection = api.store.addCollection('TestPost')

  expect(() => {
    collection.addNode({
      internal: {
        mimeType: 'text/markdown',
        content: '# Test'
      }
    })
  }).toThrow('text/markdown')
})

test('generate slug from any string', async () => {
  const api = await createPlugin()

  const slug1 = api.store.slugify('Lorem ipsum dolor sit amet')
  const slug2 = api.store.slugify('String with æøå characters')
  const slug3 = api.store.slugify('String/with / slashes')
  const slug4 = api.store.slugify('  Trim  string   ')

  expect(slug1).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(slug2).toEqual('string-with-aeoa-characters')
  expect(slug3).toEqual('string-with-slashes')
  expect(slug4).toEqual('trim-string')
})

test('modify node with api.onCreateNode()', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      store.addCollection('Test').addNode({ id: '1' })
    })
    api.onCreateNode(node => {
      return {
        ...node,
        title: 'Some title'
      }
    })
  })

  const collection = app.store.getCollection('Test')
  const node = collection.getNode('1')

  expect(node.title).toEqual('Some title')
})

test('get collection through actions', async () => {
  let collection = null
  let node1
  let node2

  await createApp(function (api) {
    api.loadSource(({ addCollection }) => {
      const test = addCollection('Test')
      test.addNode({ id: '1', $uid: '123' })
    })
    api.createSchema(({ getCollection, getNodeByUid, getNode }) => {
      collection = getCollection('Test')
      node1 = getNodeByUid('123')
      node2 = getNode('Test', '1')
    })
  })

  expect(collection).not.toBeFalsy()
  expect(node1).not.toBeFalsy()
  expect(node2).not.toBeFalsy()
})

test('exclude node with api.onCreateNode()', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      store.addCollection('Test').addNode({ id: '1' })
    })
    api.onCreateNode(node => {
      if (
        node.internal.typeName === 'Test' &&
        node.id === '1'
      ) return null

      return node
    })
  })

  const collection = app.store.getCollection('Test')
  const node = collection.getNode('1')

  expect(node).toBeNull()
})

test('experimental: add transformer', async () => {
  const api = await createPlugin()
  const posts = api.store.addCollection('TestPost')

  api.store._addTransformer(class {
    static mimeTypes () {
      return ['application/test']
    }

    parse (content) {
      return JSON.parse(content)
    }
  })

  const node = posts.addNode({
    internal: {
      mimeType: 'application/test',
      content: JSON.stringify({ test: true })
    }
  })

  expect(node.test).toEqual(true)
})
