const App = require('../lib/app/App')
const PluginAPI = require('../lib/app/PluginAPI')

let app, api

const transformers = {
  'application/json': {
    parse (content) {
      return {
        fields: JSON.parse(content)
      }
    }
  }
}

beforeEach(() => {
  app = new App('/', { config: { plugins: [] }})
  app.init()
  api = new PluginAPI(app, { options: {}, transformers })
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
  expect(node.refs).toMatchObject({})
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
