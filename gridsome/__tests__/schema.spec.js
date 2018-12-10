const path = require('path')
const App = require('../lib/app/App')
const { graphql } = require('../graphql')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

const context = __dirname
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
      targetDir: context,
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

test('add meta data', async () => {
  api.store.addMetaData('myValue', {
    test: 'Test Value',
    image: path.join(context, 'assets', '350x250.png'),
    file: path.join(context, 'assets', 'dummy.pdf')
  })

  api.store.addMetaData('myValue', {
    object: {
      list: ['one', 'two', 'three'],
      value: 1000
    }
  })

  api.store.addMetaData('myList', [
    {
      name: 'Etiam Nibh',
      description: 'Sociis natoque penatibus.'
    },
    {
      name: 'Tellus Ultricies Cursus',
      description: 'Nascetur ridiculus mus.'
    }
  ])

  api.store.addMetaData('myList', [
    {
      name: 'Vulputate Magna',
      description: 'Cras justo odio.'
    }
  ])

  api.store.addMetaData('myOtherValue', 'Value')

  const query = `{
    metaData {
      myValue {
        test
        image
        file
        object {
          list
          value
        }
      }
      myOtherValue
      myList {
        name
        description
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.metaData.myValue.test).toEqual('Test Value')
  expect(data.metaData.myValue.image.src).toEqual('/assets/static/350x250-w350.test.png')
  expect(data.metaData.myValue.file.src).toEqual('/assets/files/dummy.pdf')
  expect(data.metaData.myValue.object.list).toHaveLength(3)
  expect(data.metaData.myValue.object.value).toEqual(1000)
  expect(data.metaData.myOtherValue).toEqual('Value')
  expect(data.metaData.myList).toHaveLength(3)
  expect(data.metaData.myList[0]).toMatchObject({
    name: 'Etiam Nibh',
    description: 'Sociis natoque penatibus.'
  })
  expect(data.metaData.myList[1]).toMatchObject({
    name: 'Tellus Ultricies Cursus',
    description: 'Nascetur ridiculus mus.'
  })
  expect(data.metaData.myList[2]).toMatchObject({
    name: 'Vulputate Magna',
    description: 'Cras justo odio.'
  })
})

test('create node type with custom fields', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  posts.addNode({
    id: '2',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  const query = '{ testPost (id: "1") { id foo list obj { foo }}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.id).toEqual('1')
  expect(data.testPost.foo).toEqual('bar')
  expect(data.testPost.list[0]).toEqual('item')
  expect(data.testPost.obj.foo).toEqual('bar')
})

// TODO: remove test before 1.0
test('get deprecated node fields', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({
    _id: '1',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  const query = '{ testPost (_id: "1") { _id fields { foo list obj { foo } }}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost._id).toEqual('1')
  expect(data.testPost.fields.foo).toEqual('bar')
  expect(data.testPost.fields.list[0]).toEqual('item')
  expect(data.testPost.fields.obj.foo).toEqual('bar')
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

test('fail if node with given ID is missing', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode({ id: '1' })

  const query = '{ testPost (id: "2") { id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('A TestPost with id 2 was not found')
})

test('fail if node with given path is missing', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPost'
  })

  posts.addNode('post', { path: '/test' })

  const query = '{ testPost (path: "/fail") { _id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('/fail was not found')
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

  authors.addNode({
    id: '2',
    title: 'Test Author'
  })

  posts.addNode({
    id: '1',
    fields: {
      author: '2',
      customRefs: {
        author: {
          typeName: 'TestAuthor',
          id: '2'
        }
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      author { id title }
      customRefs {
        author { id title }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.author.id).toEqual('2')
  expect(data.testPost.author.title).toEqual('Test Author')
  expect(data.testPost.customRefs.author.id).toEqual('2')
  expect(data.testPost.customRefs.author.title).toEqual('Test Author')
})

// TODO: remove this test before 1.0
test('create deprecated node reference', async () => {
  const authors = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const posts = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: '_id',
        typeName: 'TestAuthor'
      },
      authors: {
        key: '_id',
        typeName: 'TestAuthor'
      }
    }
  })

  posts.addNode({ _id: '1', fields: { author: '1', authors: ['1', '2'] }})
  posts.addNode({ _id: '2', fields: { author: '8', authors: ['8', '9'] }})
  authors.addNode({ _id: '1', title: 'Test Author' })
  authors.addNode({ _id: '2', title: 'Test Author 2' })
  authors.addNode({ _id: '3', title: 'Test Author 3' })

  const query = `{
    testPost: testPost (_id: "1") {
      refs {
        author { _id title }
        authors { _id title }
      }
    }
    testPost2: testPost (_id: "2") {
      refs {
        author { _id title }
        authors { _id title }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.refs.author._id).toEqual('1')
  expect(data.testPost.refs.author.title).toEqual('Test Author')
  expect(data.testPost.refs.authors).toHaveLength(2)
  expect(data.testPost.refs.authors[0]).toMatchObject({ _id: '1', title: 'Test Author' })
  expect(data.testPost.refs.authors[1]).toMatchObject({ _id: '2', title: 'Test Author 2' })
  expect(data.testPost2.refs.author).toBeNull()
  expect(data.testPost2.refs.authors).toHaveLength(0)
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

  authors.addNode({ id: '2', title: 'First Author' })
  authors.addNode({ id: '3', title: 'Second Author' })
  authors.addNode({ id: '4', title: 'Third Author' })

  posts.addNode({
    id: '1',
    fields: {
      author: '2',
      customRefs: {
        authors: [
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
  expect(data.testPost.author.id).toEqual('2')
  expect(data.testPost.author.title).toEqual('First Author')
  expect(data.testPost.customRefs.authors).toHaveLength(2)
  expect(data.testPost.customRefs.authors[0].title).toEqual('Second Author')
  expect(data.testPost.customRefs.authors[1].title).toEqual('Third Author')
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
          { typeName: 'TestUser', id: '1' },
          { typeName: 'TestAuthor', id: '2' },
          { typeName: 'TestUser', id: '3' }
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
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authors.addNode({ id: '2', title: 'First Author' })
  authors.addNode({ id: '3', title: 'Second Author' })
  authors.addNode({ id: '4', title: 'Third Author' })

  posts.addNode({
    id: '1',
    fields: {
      authors: {
        typeName: 'TestAuthor',
        id: ['2', '3', '4']
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      authors (sortBy: "title", limit: 2, skip: 1) {
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

  const query = '{ testPost (id: "1") { refs { related { id title }}}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.refs.related.id).toEqual('2')
  expect(data.testPost.refs.related.title).toEqual('Test')
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
        { typeName: 'TestAuthor', id: '1' },
        { typeName: 'TestUser', id: '1' }
      ]
    }
  })

  const query = `{
    testPost (id: "3") {
      id
      people {
        ...on NodeInterface {
          id
          title
        }
        ...on TestAuthor {
          name
        }
        ...on TestUser {
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

test('should convert keys to valid field names', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  const node = contentType.addNode({
    id: '1',
    fields: {
      'my-object': {
        '2value': 'test',
        ':value': 'test',
        'test:value': 'test',
        'other-object': {
          value: 'test'
        }
      }
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      myObject {
        _2value
        value
        testValue
        otherObject {
          value
        }
      }
    }
  }`)

  const obj = {
    myObject: {
      _2value: 'test',
      value: 'test',
      testValue: 'test',
      otherObject: {
        value: 'test'
      }
    }
  }

  expect(errors).toBeUndefined()
  expect(data.testPost).toMatchObject(obj)
  expect(node.fields).toMatchObject(obj)
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
  expect(node.fields.__hidden).toBeTruthy()
  expect(node.fields.nested['__nested-hidden']).toBeTruthy()
})

test('should format dates from schema', async () => {
  const posts = api.store.addContentType({
    typeName: 'TestPostDate'
  })

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

  const { errors, data } = await createSchemaAndExecute(`{
    testPostDate (id: "1") {
      date
      customDate
      date2: date(format: "YYYY-MM-DD")
      date3: customDate(format: "DD/MM/YYYY")
      dateObject {
        date(format: "DD/MM/YYYY")
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPostDate.date).toEqual('2018-10-10T00:00:00+02:00')
  expect(data.testPostDate.customDate).toEqual('2018-10-10T00:00:00+02:00')
  expect(data.testPostDate.date2).toEqual('2018-10-10')
  expect(data.testPostDate.date3).toEqual('10/10/2018')
  expect(data.testPostDate.dateObject.date).toEqual('10/10/2018')
})

test('add custom schema fields', async () => {
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
        image4: '1000x600.png'
      })
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      image
      image2
      image3
      image4 (width: 300, quality: 100, blur: 0)
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.image.type).toEqual('image')
  expect(data.testPost.image.mimeType).toEqual('image/png')
  expect(data.testPost.image.src).toEqual('/assets/350x250.png')
  expect(data.testPost.image.size).toBeUndefined()
  expect(data.testPost.image.sizes).toBeUndefined()
  expect(data.testPost.image.srcset).toBeUndefined()
  expect(data.testPost.image.dataUri).toBeUndefined()
  expect(data.testPost.image2.type).toEqual('image')
  expect(data.testPost.image2.mimeType).toEqual('image/png')
  expect(data.testPost.image2.src).toEqual('https://www.example.com/images/image.png')
  expect(data.testPost.image3.type).toEqual('image')
  expect(data.testPost.image3.mimeType).toEqual('image/png')
  expect(data.testPost.image3.src).toEqual('/assets/static/350x250-w350.test.png')
  expect(data.testPost.image3.size).toMatchObject({ width: 350, height: 250 })
  expect(data.testPost.image3.sizes).toEqual('(max-width: 350px) 100vw, 350px')
  expect(data.testPost.image3.srcset).toHaveLength(1)
  expect(data.testPost.image3.dataUri).toMatch(/data:image\/png/g)
  expect(data.testPost.image4.src).toEqual('/assets/static/1000x600-w300-q100.test.png')
  expect(data.testPost.image4.size).toMatchObject({ width: 300, height: 180 })
  expect(data.testPost.image4.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(data.testPost.image4.srcset).toHaveLength(1)
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
  expect(data.testPost.file.type).toEqual('file')
  expect(data.testPost.file.mimeType).toEqual('application/pdf')
  expect(data.testPost.file.src).toEqual('/assets/document.pdf')
  expect(data.testPost.file2.type).toEqual('file')
  expect(data.testPost.file2.mimeType).toEqual('application/pdf')
  expect(data.testPost.file2.src).toEqual('https://www.example.com/assets/document.pdf')
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
