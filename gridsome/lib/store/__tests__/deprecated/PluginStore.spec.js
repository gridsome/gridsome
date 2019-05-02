const App = require('../../../app/App')
const PluginAPI = require('../../../app/PluginAPI')
const JSONTransformer = require('../__fixtures__/JSONTransformer')

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
  expect(contentType.options.routeKeys[1]).toMatchObject({ name: 'bar', path: ['bar'], fieldName: 'bar', repeat: false })
  expect(contentType.options.routeKeys[2]).toMatchObject({ name: 'foo_raw', path: ['foo'], fieldName: 'foo', repeat: false })
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

  const contentType = api.store.addContentType('TestPost')

  const node = contentType.addNode({
    id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  const entry = api.store.store.index.findOne({ uid: node.$uid })

  expect(node).toHaveProperty('$loki')
  expect(node.id).toEqual('test')
  expect(typeof node.$uid).toEqual('string')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('Lorem ipsum dolor sit amet')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(node.$uid)
  expect(entry.typeName).toEqual('TestPost')
})

test('update node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    route: '/test/:foo/:slug'
  })

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
  const uid = oldNode.$uid

  const node = contentType.updateNode({
    id: 'test',
    title: 'New title',
    content: 'Praesent commodo cursus magna',
    excerpt: 'Praesent commodo...',
    fields: {
      foo: 'foo'
    }
  })

  const entry = api.store.store.index.findOne({ uid: node.$uid })

  expect(node.id).toEqual('test')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('New title')
  expect(node.path).toEqual('/test/foo/new-title')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.content).toEqual('Praesent commodo cursus magna')
  expect(node.excerpt).toEqual('Praesent commodo...')
  expect(node.foo).toEqual('foo')
  expect(node.internal.timestamp).not.toEqual(oldTimestamp)
  expect(entry.id).toEqual('test')
  expect(entry.uid).toEqual(uid)
})

test('change node id', () => {
  const { store } = createPlugin()

  const uid = 'test'
  const contentType = store.addContentType('TestPost')

  const node1 = contentType.addNode({ $uid: uid, id: 'test' })

  expect(node1.id).toEqual('test')

  const node2 = contentType.updateNode({ $uid: uid, id: 'test-2' })
  const entry = store.store.index.findOne({ uid })

  expect(node2.id).toEqual('test-2')
  expect(node2.$uid).toEqual('test')
  expect(entry.uid).toEqual('test')
})

test('prioritize node.id over fields.id', () => {
  const contentType = createPlugin().store.addContentType('Test')

  const node = contentType.addNode({
    id: 'foo',
    fields: {
      id: 'bar'
    }
  })

  expect(node.id).toEqual('foo')
})

test('get node by id', () => {
  const posts = createPlugin().store.addContentType('Post')

  posts.addNode({ id: '1' })
  posts.addNode({ id: '2' })
  posts.addNode({ id: '3' })

  expect(posts.getNode('2').id).toEqual('2')
})

test('remove node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType('TestPost')
  const node = contentType.addNode({ id: 'test' })

  contentType.removeNode('test')

  const entry = api.store.store.index.findOne({ uid: node.$uid })

  expect(contentType.getNode('test')).toBeNull()
  expect(entry).toBeNull()
})

test('add nodes with custom fields', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType('TestPost')

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
  const contentType = createPlugin().store.addContentType('TestPost')

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

test('transform node', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType('TestPost')

  const node = contentType.addNode({
    internal: {
      mimeType: 'application/json',
      content: JSON.stringify({ foo: 'bar' })
    }
  })

  expect(node).toMatchObject({ foo: 'bar' })
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
      filepath: 'dir/to/image.png',
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

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('/absolute/dir/to/project/image.png')
  expect(node.file3).toEqual('/absolute/dir/to/image.png')
  expect(node.filepath).toEqual('dir/to/image.png')
  expect(node.url).toEqual('https://example.com/image.jpg')
  expect(node.url2).toEqual('//example.com/image.jpg')
  expect(node.url3).toEqual('git@github.com:gridsome/gridsome.git')
  expect(node.url4).toEqual('ftp://ftp.example.com')
  expect(node.email).toEqual('email@example.com')
  expect(node.text).toEqual('Lorem ipsum dolor sit amet.')
  expect(node.text2).toEqual('example.com')
  expect(node.text3).toEqual('md')
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

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('/absolute/dir/to/project/image.png')
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

  expect(node1.file).toEqual('/path/to/dir/image.png')
  expect(node2.file).toEqual('/path/to/dir/image.png')
})

test('don\'t touch absolute paths when resolveAbsolutePaths is not set', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType = api.store.addContentType('A')

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

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('/image.png')
  expect(node.file3).toEqual('/absolute/dir/to/image.png')
})

test('always resolve relative paths from filesytem sources', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType('A')

  const node = contentType.addNode({
    fields: {
      file: '../image.png'
    },
    internal: {
      origin: '/absolute/dir/to/a/file.md'
    }
  })

  expect(node.file).toEqual('/absolute/dir/to/image.png')
})

test('dont resolve relative paths when no origin', () => {
  const api = createPlugin()

  const contentType = api.store.addContentType('A')

  const node = contentType.addNode({
    fields: {
      file: '../image.png'
    }
  })

  expect(node.file).toEqual('../image.png')
})

test('resolve relative paths from external sources', () => {
  const api = createPlugin()

  const contentType1 = api.store.addContentType('A')

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

  expect(node.filename).toEqual('image.png')
  expect(node.file2).toEqual('/image.png')
  expect(node.file3).toEqual('https://www.example.com/2018/image.png')
})

test('resolve absolute paths from external sources', () => {
  const api = createPlugin('/absolute/dir/to/project')

  const contentType2 = api.store.addContentType({
    typeName: 'B',
    resolveAbsolutePaths: true
  })

  const node3 = contentType2.addNode({
    fields: {
      filepath: 'images/image.png',
      file2: '/images/image.png',
      file3: './images/image.png'
    },
    internal: {
      origin: 'https://www.example.com/2018/11/02/another-blog-post/'
    }
  })

  expect(node3.filepath).toEqual('images/image.png')
  expect(node3.file2).toEqual('https://www.example.com/images/image.png')
  expect(node3.file3).toEqual('https://www.example.com/2018/11/02/another-blog-post/images/image.png')
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

  expect(node.file).toEqual('image.png')
  expect(node.file2).toEqual('https://cdn.example.com/assets/image.png')
  expect(node.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node.file4).toEqual('https://subdomain.example.com/images/image.png')

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

  expect(node2.file).toEqual('image.png')
  expect(node2.file2).toEqual('https://cdn.example.com/assets/images/image.png')
  expect(node2.file3).toEqual('https://www.example.com/2018/11/image.png')
  expect(node2.file4).toEqual('https://subdomain.example.com/images/image.png')
})
