const Store = require('../lib/utils/Store')
const Source = require('../lib/utils/Source')

let store, source

const transformers = {
  'application/json': {
    parse (content) {
      return JSON.parse(content)
    }
  }
}

beforeEach(() => {
  store = new Store()
  source = new Source({ typeName: 'Test' }, { store, transformers })
})

afterAll(() => {
  store = null
  source = null
})

test('add type', () => {
  const contentType = source.addType('post')

  expect(contentType.type).toEqual('post')
  expect(contentType.name).toEqual('TestPost')
  expect(contentType.route).toBeUndefined()
  expect(typeof contentType.makePath).toBe('function')
  expect(store.types).toHaveProperty('TestPost')
  expect(store.collections).toHaveProperty('TestPost')
  expect(source.ownTypeNames).toContain('TestPost')
})

test('add node', () => {
  source.addType('post')

  const emit = jest.spyOn(source, 'emit')
  const node = source.addNode('post', {
    _id: 'test',
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(node).toHaveProperty('$loki')
  expect(node._id).toEqual('test')
  expect(node.type).toEqual('post')
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
  const emit = jest.spyOn(source, 'emit')

  source.addType('post')

  const oldNode = source.addNode('post', {
    _id: 'test',
    date: '2018-09-04T23:20:33.918Z'
  })

  const oldTimestamp = oldNode.internal.timestamp

  const node = source.updateNode('post', 'test', {
    title: 'New title'
  })

  expect(node._id).toEqual('test')
  expect(node.type).toEqual('post')
  expect(node.typeName).toEqual('TestPost')
  expect(node.title).toEqual('New title')
  expect(node.slug).toEqual('new-title')
  expect(node.date).toEqual('2018-09-04T23:20:33.918Z')
  expect(node.internal.timestamp).not.toEqual(oldTimestamp)
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('remove node', () => {
  const emit = jest.spyOn(source, 'emit')

  source.addType('post')
  source.addNode('post', { _id: 'test' })
  source.removeNode('post', 'test')

  expect(source.getNode('post', 'test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('add type with ref', () => {
  const contentType = source.addType('post', {
    refs: {
      author: {
        key: '_id',
        type: 'author'
      }
    }
  })

  expect(contentType.refs.author).toMatchObject({
    type: 'author',
    key: '_id',
    typeName: 'TestAuthor',
    schemaType: 'TestAuthor',
    description: 'Reference to author'
  })
})

test('add type with dynamic route', () => {
  const contentType = source.addType('post', {
    route: ':year/:month/:day/:slug'
  })

  const node = source.addNode('post', {
    title: 'Lorem ipsum dolor sit amet',
    date: '2018-09-04T23:20:33.918Z'
  })

  expect(contentType.route).toEqual(':year/:month/:day/:slug')
  expect(node.path).toEqual('2018/09/05/lorem-ipsum-dolor-sit-amet')
})

test('generate slug from any string', () => {
  const slug1 = source.slugify('Lorem ipsum dolor sit amet')
  const slug2 = source.slugify('String with æøå characters')
  const slug3 = source.slugify('String/with / slashes')
  const slug4 = source.slugify('  Trim  string   ')

  expect(slug1).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(slug2).toEqual('string-with-aeoa-characters')
  expect(slug3).toEqual('string-with-slashes')
  expect(slug4).toEqual('trim-string')
})

test('add page', () => {
  const emit = jest.spyOn(source, 'emit')
  const page = source.addPage('page', {
    title: 'Lorem ipsum dolor sit amet'
  })

  expect(page).toHaveProperty('$loki')
  expect(page).toHaveProperty('pageQuery')
  expect(page.type).toEqual('page')
  expect(page.title).toEqual('Lorem ipsum dolor sit amet')
  expect(page.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(page.path).toEqual('/lorem-ipsum-dolor-sit-amet')
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('add page with query', () => {
  const page = source.addPage('page', {
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
  source.addPage('page', {
    _id: 'test',
    title: 'Lorem ipsum dolor sit amet'
  })

  const emit = jest.spyOn(source, 'emit')
  const page = source.updatePage('test', {
    title: 'New title'
  })

  expect(page.title).toEqual('New title')
  expect(page.slug).toEqual('lorem-ipsum-dolor-sit-amet')
  expect(page.path).toEqual('/lorem-ipsum-dolor-sit-amet')
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('update page path when slug is changed', () => {
  source.addPage('page', { _id: 'test' })

  const page = source.updatePage('test', {
    slug: 'new-title'
  })

  expect(page.title).toEqual('test')
  expect(page.slug).toEqual('new-title')
  expect(page.path).toEqual('/new-title')
})

test('remove page', () => {
  const emit = jest.spyOn(source, 'emit')

  source.addPage('page', { _id: 'test' })
  source.removePage('test')

  expect(source.getPage('test')).toBeNull()
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('transform node', () => {
  const content = JSON.stringify({ foo: 'bar' })
  const mimeType = source.mime.lookup('filename.json')
  const result = source.transform(mimeType, content)

  expect(result).toMatchObject({ foo: 'bar' })
})

test('fail if transformer is not installed', () => {
  expect(() => {
    source.transform('text/markdown', '')
  }).toThrow('No transformer for text/markdown is installed')
})
