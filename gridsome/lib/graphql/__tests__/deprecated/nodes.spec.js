const path = require('path')
const App = require('../../../app/App')
const { graphql } = require('../../graphql')
const PluginAPI = require('../../../app/PluginAPI')
const createSchema = require('../../createSchema')
const JSONTransformer = require('../__fixtures__/JSONTransformer')

const context = path.resolve(__dirname, '../../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

let app, api

beforeEach(() => {
  app = new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      imagesDir,
      filesDir,
      outDir: context,
      imageExtensions: ['.png'],
      maxImageWidth: 1000
    }
  }).init()

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

test('create node type with custom fields', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    fields: {
      foo: 'bar',
      emptyString: '',
      price: '',
      list: ['item'],
      obj: {
        foo: 'foo'
      }
    }
  })

  posts.addNode({
    id: '2',
    fields: {
      foo: 'bar',
      list: ['item'],
      price: '198.00',
      obj: {
        foo: 'bar'
      }
    }
  })

  const query = `{
    testPost (id: "2") {
      foo
      list
      price
      emptyString
      obj { foo }
    }
  }`

  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.foo).toEqual('bar')
  expect(data.testPost.emptyString).toEqual('')
  expect(data.testPost.price).toEqual('198.00')
  expect(data.testPost.list).toHaveLength(1)
  expect(data.testPost.list[0]).toEqual('item')
  expect(data.testPost.obj.foo).toEqual('bar')
})

// TODO: remove test before 1.0
test('use deprectaded node fields as custom fields', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost',
    route: '/test/:slug'
  })

  posts.addNode({
    id: '1',
    title: 'Slug fallback',
    content: 'Content',
    excerpt: 'Excerpt'
  })

  const query = '{ testPost (id: "1") { id path content excerpt }}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.path).toEqual('/test/slug-fallback')
  expect(data.testPost.content).toEqual('Content')
  expect(data.testPost.excerpt).toEqual('Excerpt')
})

test('get node by path', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({ id: '1', path: '/test' })

  const query = '{ testPost (path: "/test") { id }}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('1')
})

test('get node by id', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ id: '20', title: 'Test' })

  const query = '{ testPost (id: "20") { id title }}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('20')
  expect(data.testPost.title).toEqual('Test')
})

test('create connection', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({ title: 'test 1', date: '2018-09-01T00:00:00.000Z' })
  posts.addNode({ title: 'test 2', date: '2018-09-04T00:00:00.000Z' })

  const query = '{ allTestPost { totalCount edges { node { title }}}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.allTestPost.totalCount).toEqual(2)
  expect(data.allTestPost.edges[0].node.title).toEqual('test 2')
  expect(data.allTestPost.edges[1].node.title).toEqual('test 1')
})

test('sort nodes collection', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ title: 'c' })
  contentType.addNode({ title: 'b' })
  contentType.addNode({ title: 'a' })

  const query = `{
    allTestPost (sortBy: "title", order: ASC) {
      edges {
        node { title }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.allTestPost.edges.length).toEqual(3)
  expect(data.allTestPost.edges[0].node.title).toEqual('a')
  expect(data.allTestPost.edges[1].node.title).toEqual('b')
  expect(data.allTestPost.edges[2].node.title).toEqual('c')
})

test('sort nodes collection by custom field', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ id: '1', fields: { value: 'c' }})
  contentType.addNode({ id: '2', fields: { value: 'b' }})
  contentType.addNode({ id: '3', fields: { value: 'a' }})

  const query = `{
    allTestPost (sortBy: "value", order: ASC) {
      edges {
        node { value }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.allTestPost.edges.length).toEqual(3)
  expect(data.allTestPost.edges[0].node.value).toEqual('a')
  expect(data.allTestPost.edges[1].node.value).toEqual('b')
  expect(data.allTestPost.edges[2].node.value).toEqual('c')
})

test('get nodes by path regex', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({ path: '/node-1' })
  posts.addNode({ path: '/node-2' })
  posts.addNode({ path: '/some-3' })

  const query = '{ allTestPost (regex: "/node") { edges { node { _id }}}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.allTestPost.edges.length).toEqual(2)
})

test('create node reference', async () => {
  const authors = api.store.addContentType('TestAuthor')

  const posts = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authors.addNode({
    id: '2'
  })

  posts.addNode({
    id: '1',
    fields: {
      author: '2',
      customRefs: [
        api.store.createReference('TestAuthor', '2')
      ]
    }
  })

  posts.addNode({
    id: '2',
    fields: {
      customRef: api.store.createReference('TestAuthor', '2')
    }
  })

  const query = `{
    post1: testPost (id: "1") {
      author { id }
      customRef { id }
      customRefs { id }
    }
    post2: testPost (id: "2") {
      author { id }
      customRef { id }
      customRefs { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post1.author.id).toEqual('2')
  expect(data.post1.customRef).toEqual(null)
  expect(data.post1.customRefs).toHaveLength(1)
  expect(data.post1.customRefs[0].id).toEqual('2')
  expect(data.post2.author).toEqual(null)
  expect(data.post2.customRef.id).toEqual('2')
  expect(data.post2.customRefs).toHaveLength(0)
})

test('create node reference to same typeName', async () => {
  const { addNode } = api.store.addContentType({
    typeName: 'TestPost'
  })

  const post = addNode({ id: '1' })

  addNode({
    id: '2',
    fields: {
      rel: api.store.createReference('TestPost', '1')
    }
  })

  addNode({
    id: '3',
    fields: {
      rel: api.store.createReference(post)
    }
  })

  const query = `{
    post1: testPost (id: "2") {
      rel { id }
    }
    post2: testPost (id: "3") {
      rel { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post1.rel.id).toEqual('1')
  expect(data.post2.rel.id).toEqual('1')
})

test('create references with collection.addReference()', async () => {
  const authors = api.store.addContentType('Author')
  const posts = api.store.addContentType('Post')

  posts.addReference('author1', 'Author')
  posts.addReference('author2', { typeName: 'Author' })

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', fields: { author1: '1', author2: '1' }})

  const query = `{
    post (id: "1") {
      author1 { id }
      author2 { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post.author1.id).toEqual('1')
  expect(data.post.author2.id).toEqual('1')
})

test('create node list reference', async () => {
  const authors = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const posts = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authors.addNode({ id: '1', title: 'A Author' })
  authors.addNode({ id: '2', title: 'B Author' })
  authors.addNode({ id: '3', title: 'C Author' })
  authors.addNode({ id: '4', title: 'D Author' })

  posts.addNode({
    id: '1',
    fields: {
      author: '1',
      customRefs: {
        authors: [
          { typeName: 'TestAuthor', id: '1' },
          { typeName: 'TestAuthor', id: '2' },
          { typeName: 'TestAuthor', id: '3' },
          { typeName: 'TestAuthor', id: '4' }
        ]
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      author { id title }
      customRefs {
        authors (sortBy: "title", limit: 2, skip: 1) {
          id
          title
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.author.id).toEqual('1')
  expect(data.testPost.author.title).toEqual('A Author')
  expect(data.testPost.customRefs.authors).toHaveLength(2)
  expect(data.testPost.customRefs.authors[0].title).toEqual('C Author')
  expect(data.testPost.customRefs.authors[1].title).toEqual('B Author')
})

test('create node list reference with missing types', async () => {
  const authors = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  authors.addNode({ id: '1', title: 'First Author' })
  authors.addNode({ id: '2', title: 'Second Author' })
  authors.addNode({ id: '3', title: 'Third Author' })

  posts.addNode({
    id: '1',
    fields: {
      customRefs: {
        authors: [
          api.store.createReference('TestUser', '1'),
          api.store.createReference('TestAuthor', '2'),
          api.store.createReference('TestUser', '3')
        ]
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      customRefs {
        authors {
          title
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.customRefs.authors).toHaveLength(1)
  expect(data.testPost.customRefs.authors[0].title).toEqual('Second Author')
})

test('create node list reference with id as array', async () => {
  const authors = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  authors.addNode({ id: '2', title: 'First Author' })
  authors.addNode({ id: '3', title: 'Second Author' })
  authors.addNode({ id: '4', title: 'Third Author' })

  posts.addNode({
    id: '1',
    fields: {
      authors: api.store.createReference('TestAuthor', ['2', '3', '4'])
    }
  })

  const query = `{
    testPost (id: "1") {
      authors (sortBy: "title", order: ASC, limit: 2, skip: 1) {
        id
        title
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.authors).toHaveLength(2)
  expect(data.testPost.authors[0].title).toEqual('Second Author')
  expect(data.testPost.authors[1].title).toEqual('Third Author')
})

test('create node reference to same type', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      related: {
        key: 'id'
      }
    }
  })

  posts.addNode({ id: '1', fields: { related: '2' }})
  posts.addNode({ id: '2', title: 'Test' })

  const query = '{ testPost (id: "1") { related { id title }}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.related.id).toEqual('2')
  expect(data.testPost.related.title).toEqual('Test')
})

test('create reference with multiple node types', async () => {
  const posts = api.store.addContentType({ typeName: 'TestPost' })
  const authors = api.store.addContentType({ typeName: 'TestAuthor' })
  const users = api.store.addContentType({ typeName: 'TestUser' })

  authors.addNode({ id: '1', title: 'Author', fields: { name: 'Test' }})
  users.addNode({ id: '1', title: 'User', fields: { username: 'test' }})
  users.addNode({ id: '2', title: 'User 2', fields: { username: 'test2' }})

  posts.addNode({
    id: '3',
    fields: {
      people: [
        api.store.createReference('TestAuthor', '1'),
        api.store.createReference('TestUser', '1')
      ]
    }
  })

  const query = `{
    testPost (id: "3") {
      id
      people {
        ...on Node {
          id
        }
        ...on TestAuthor {
          title
          name
        }
        ...on TestUser {
          title
          username
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.people).toHaveLength(2)
  expect(data.testPost.people[0]).toMatchObject({ id: '1', title: 'Author', name: 'Test' })
  expect(data.testPost.people[1]).toMatchObject({ id: '1', title: 'User', username: 'test' })
})

test('should get values from object fields', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    fields: {
      myObject: {
        value: 'test1',
        otherObject: {
          value: 'test2'
        }
      }
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      myObject {
        value
        otherObject {
          value
        }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.myObject.value).toEqual('test1')
  expect(data.testPost.myObject.otherObject.value).toEqual('test2')
})

test('preserve internal custom fields', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const node = contentType.addNode({
    id: '1',
    fields: {
      __hidden: true,
      nested: {
        value: 'test',
        '__nested-hidden': true
      }
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      __hidden
      nested {
        value
        __nested_hidden
      }
    }
  }`)

  expect(data).toBeUndefined()
  expect(errors).toHaveLength(2)
  expect(errors[0].message).toEqual('Cannot query field "__hidden" on type "TestPost".')
  expect(errors[1].message).toEqual('Cannot query field "__nested_hidden" on type "TestPostNested".')
  expect(node.__hidden).toBeTruthy()
  expect(node.nested['__nested-hidden']).toBeTruthy()
})

test('should format dates from schema', async () => {
  const posts = api.store.addContentType('TestPostDate')

  posts.addNode({
    id: '1',
    date: '2018-10-10',
    fields: {
      customDate: '2018-10-10',
      dateObject: {
        date: '2018-10-10'
      }
    }
  })

  posts.addNode({
    id: '2',
    date: new Date('2018-10-10'),
    fields: {
      dateType: new Date('2018-10-10')
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    post1: testPostDate (id: "1") {
      date
      customDate
      date2: date(format: "YYYY-MM-DD")
      date3: customDate(format: "DD/MM/YYYY")
      dateObject {
        date(format: "DD/MM/YYYY")
      }
    }
    post2: testPostDate (id: "2") {
      date
      dateType(format: "DD/MM/YYYY")
    }
    post3: testPostDate (id: "2") {
      date(format: "DD/MM/YYYY")
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post1.date).toEqual('2018-10-10')
  expect(data.post1.customDate).toEqual('2018-10-10')
  expect(data.post1.date2).toEqual('2018-10-10')
  expect(data.post1.date3).toEqual('10/10/2018')
  expect(data.post2.date).toEqual('2018-10-10T00:00:00.000Z')
  expect(data.post2.dateType).toEqual('10/10/2018')
  expect(data.post3.date).toEqual('10/10/2018')
})

test('collection.addSchemaField', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    fields: {
      myField: 'test'
    }
  })

  contentType.addSchemaField('myField', payload => {
    const { nodeTypes, nodeType, graphql } = payload

    expect(payload.contentType).toEqual(contentType)
    expect(nodeTypes).toHaveProperty('TestPost')
    expect(nodeTypes['TestPost']).toEqual(nodeType)
    expect(graphql).toHaveProperty('graphql')
    expect(graphql).toHaveProperty('GraphQLID')
    expect(graphql).toHaveProperty('GraphQLInt')
    expect(graphql).toHaveProperty('GraphQLList')
    expect(graphql).toHaveProperty('GraphQLJSON')
    expect(graphql).toHaveProperty('GraphQLFloat')
    expect(graphql).toHaveProperty('GraphQLString')
    expect(graphql).toHaveProperty('GraphQLBoolean')
    expect(graphql).toHaveProperty('GraphQLNonNull')
    expect(graphql).toHaveProperty('GraphQLUnionType')
    expect(graphql).toHaveProperty('GraphQLObjectType')

    return {
      type: graphql.GraphQLString,
      resolve: () => 'my-custom-value'
    }
  })

  const query = '{ testPost (id: "1") { myField }}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.myField).toEqual('my-custom-value')
})

test('transformer extends node type', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      content: ''
    }
  })

  const query = '{ testPost (id: "1") { myField }}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.myField).toEqual('value')
})

test('transformer should resolve absolute paths', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost',
    resolveAbsolutePaths: true
  })

  posts.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({})
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      fileField
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.fileField).toEqual(`${context}/assets/image.png`)
})

test('process image types in schema', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({
        image: '/assets/350x250.png',
        image2: 'https://www.example.com/images/image.png',
        image3: './350x250.png',
        image4: 'dir/to/350x250.png',
        image5: '350x250.png'
      })
    }
  })

  posts.addNode({
    id: '2',
    internal: {
      mimeType: 'application/json',
      content: JSON.stringify({
        image: '/assets/350x250.png',
        image2: 'https://www.example.com/images/image.png',
        image3: './350x250.png',
        image4: 'dir/to/350x250.png',
        image5: '350x250.png'
      })
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      image
      image2
      image3 (width: 300, quality: 100, blur: 0)
      image4
      image5
    }
    testPost2: testPost (id: "2") {
      image
      image2
      image3 (width: 300, quality: 100, blur: 0)
      image4
      image5
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.image).toEqual('/assets/350x250.png')
  expect(data.testPost.image2).toEqual('https://www.example.com/images/image.png')
  expect(data.testPost.image3.type).toEqual('image')
  expect(data.testPost.image3.mimeType).toEqual('image/png')
  expect(data.testPost.image3.src).toEqual('/assets/static/350x250.f14e36e.test.png')
  expect(data.testPost.image3.size).toMatchObject({ width: 300, height: 215 })
  expect(data.testPost.image3.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(data.testPost.image3.srcset).toHaveLength(1)
  expect(data.testPost.image4).toEqual('dir/to/350x250.png')
  expect(data.testPost.image5).toEqual('350x250.png')
  expect(data.testPost2.image).toEqual('/assets/350x250.png')
  expect(data.testPost2.image2).toEqual('https://www.example.com/images/image.png')
  expect(data.testPost2.image3).toEqual('./350x250.png')
  expect(data.testPost2.image4).toEqual('dir/to/350x250.png')
  expect(data.testPost2.image5).toEqual('350x250.png')
})

test('process file types in schema', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({
        file: '/assets/document.pdf',
        file2: 'https://www.example.com/assets/document.pdf',
        file3: './dummy.pdf',
        url: 'https://www.gridsome.org',
        url2: 'https://www.gridsome.com',
        text: 'pdf'
      })
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      file
      file2
      file3
      url
      url2
      text
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.file).toEqual('/assets/document.pdf')
  expect(data.testPost.file2).toEqual('https://www.example.com/assets/document.pdf')
  expect(data.testPost.file3.type).toEqual('file')
  expect(data.testPost.file3.mimeType).toEqual('application/pdf')
  expect(data.testPost.file3.src).toEqual('/assets/files/dummy.pdf')
  expect(data.testPost.url).toEqual('https://www.gridsome.org')
  expect(data.testPost.url2).toEqual('https://www.gridsome.com')
  expect(data.testPost.text).toEqual('pdf')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
