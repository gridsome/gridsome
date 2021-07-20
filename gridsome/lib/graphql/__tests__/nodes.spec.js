const path = require('path')
const App = require('../../app/App')
const PluginAPI = require('../../app/PluginAPI')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

const context = path.resolve(__dirname, '../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

let app, api

beforeEach(async () => {
  app = await new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      imagesDir,
      filesDir,
      outputDir: context,
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
  const posts = api.store.addCollection({
    typeName: 'TestPost'
  })

  posts.addNode({
    id: '1',
    foo: 'bar',
    emptyString: '',
    price: '',
    emptyObj: {},
    emtpyList: [],
    list: ['item'],
    obj: {
      foo: 'foo',
      list: ['item']
    }
  })

  posts.addNode({
    id: '2',
    foo: 'bar',
    list: ['item'],
    price: '198.00',
    obj: {
      foo: 'bar',
      list: null
    }
  })

  const query = `{
    testPost (id: "2") {
      foo
      list
      price
      emptyString
      obj {
        foo
        list
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.foo).toEqual('bar')
  expect(data.testPost.emptyString).toEqual('')
  expect(data.testPost.price).toEqual('198.00')
  expect(data.testPost.list).toHaveLength(1)
  expect(data.testPost.list[0]).toEqual('item')
  expect(data.testPost.obj.foo).toEqual('bar')
  expect(data.testPost.obj.list).toHaveLength(0)
})

test('get node by path', async () => {
  const posts = api.store.addCollection({
    typeName: 'TestPost'
  })

  posts.addNode({ id: '1', path: '/test' })
  posts.addNode({ id: '2', path: '/test/2/' })
  posts.addNode({ id: '3', path: '/' })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (path: "/test") { id }
    testPost2: testPost (path: "/test/2") { id }
    testPost3: testPost (path: "/test/") { id }
    testPost4: testPost (path: "/") { id }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('1')
  expect(data.testPost2.id).toEqual('2')
  expect(data.testPost3.id).toEqual('1')
  expect(data.testPost4.id).toEqual('3')
})

test('get node by id', async () => {
  const collection = api.store.addCollection({
    typeName: 'TestPost'
  })

  collection.addNode({ id: '20', title: 'Test' })
  collection.addNode({ id: 21, title: 'Test' })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "20") { id title }
    testPost2: testPost (id: "21") { id title }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('20')
  expect(data.testPost.title).toEqual('Test')
  expect(data.testPost2.id).toEqual('21')
})

test('get last node if no args are provided', async () => {
  const collection = api.store.addCollection('TestPost')
  collection.addNode({ id: '1', title: 'A' })
  collection.addNode({ id: '2', title: 'B' })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost { id title }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('2')
  expect(data.testPost.title).toEqual('B')
})

test('get last node if no args are provided with custom sort', async () => {
  const collection = api.store.addCollection({
    typeName: 'TestPost',
    dateField: 'title' // TODO: rename to `defaultSortBy`
  })
  collection.addNode({ id: '1', title: 'B' })
  collection.addNode({ id: '2', title: 'C' })
  collection.addNode({ id: '3', title: 'A' })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost { id title }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.id).toEqual('2')
  expect(data.testPost.title).toEqual('C')
})

test('create connection', async () => {
  const posts = api.store.addCollection('TestPost')

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
  const collection = api.store.addCollection({
    typeName: 'TestPost'
  })

  collection.addNode({ title: 'c' })
  collection.addNode({ title: 'b' })
  collection.addNode({ title: 'a' })

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
  const collection = api.store.addCollection({
    typeName: 'TestPost'
  })

  collection.addNode({ id: '1', value: 'c' })
  collection.addNode({ id: '2', value: 'b' })
  collection.addNode({ id: '3', value: 'a' })

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

test('sort nodes collection by multiple fields', async () => {
  const posts = api.store.addCollection('Post')
  posts.addNode({ id: '1', date: '2019-02-01', featured: true })
  posts.addNode({ id: '2', date: '2019-02-02', featured: true })
  posts.addNode({ id: '3', date: '2019-02-03', featured: false })

  const query = `{
    allPost (sort: [{ by: "featured" }, { by: "date" }]) {
      edges {
        node { id }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.allPost.edges.length).toEqual(3)
  expect(data.allPost.edges[0].node.id).toEqual('2')
  expect(data.allPost.edges[1].node.id).toEqual('1')
  expect(data.allPost.edges[2].node.id).toEqual('3')
})

test('get nodes by path regex', async () => {
  const posts = api.store.addCollection({
    typeName: 'TestPost'
  })

  posts.addNode({ path: '/node-1' })
  posts.addNode({ path: '/node-2' })
  posts.addNode({ path: '/some-3' })

  const { errors, data } = await createSchemaAndExecute(`
    query {
      allTestPost (filter: { path: { regex: "/node" }}) {
        edges {
          node {
            id
          }
        }
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.allTestPost.edges.length).toEqual(2)
})

test('should get values from object fields', async () => {
  const posts = api.store.addCollection('TestPost')

  posts.addNode({
    id: '1',
    myObject: {
      value: 'test1',
      otherObject: {
        value: 'test2'
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
  const collection = api.store.addCollection('TestPost')

  const nodeOptions = {
    id: '1',
    'my-object': {
      _valid_name: '_valid_name',
      _validName: '_validName',
      '2value': 'test',
      ':value': 'test',
      'test:value': 'test',
      'other-object': {
        value: 'test'
      }
    }
  }

  const node = collection.addNode(nodeOptions)

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      my_object {
        _valid_name
        _validName
        _2value
        _value
        test_value
        other_object {
          value
        }
      }
    }
  }`)

  const expected = {
    my_object: {
      _valid_name: '_valid_name',
      _validName: '_validName',
      _2value: 'test',
      _value: 'test',
      test_value: 'test',
      other_object: {
        value: 'test'
      }
    }
  }

  expect(errors).toBeUndefined()
  expect(data.testPost).toMatchObject(expected)
  expect(node).toMatchObject(nodeOptions)
})

test('should format dates from schema', async () => {
  const posts = api.store.addCollection('TestPostDate')

  posts.addNode({
    id: '1',
    date: '2018-10-10',
    customDate: '2018-10-10',
    dateObject: {
      date: '2018-10-10'
    }
  })

  posts.addNode({
    id: '2',
    date: new Date('2018-10-10'),
    dateType: new Date('2018-10-10')
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
  const collection = api.store.addCollection({
    typeName: 'TestPost'
  })

  collection.addNode({
    id: '1',
    myField: 'test'
  })

  collection.addSchemaField('myField', payload => {
    const { graphql } = payload

    expect(payload.collection).toEqual(collection)
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
  const posts = api.store.addCollection('TestPost')

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
  const posts = api.store.addCollection({
    typeName: 'TestPost',
    resolveAbsolutePaths: true
  })

  posts.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: path.resolve(context, 'assets/file.md'),
      content: JSON.stringify({})
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      fileField
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.testPost.fileField).toEqual(
    path.resolve(context, 'assets/image.png')
  )
})

test('process image types in schema', async () => {
  const posts = api.store.addCollection('TestPost')

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
        image5: '350x250.png',
        images: [
          './350x250.png',
          './350x250.png'
        ]
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
        image5: '350x250.png',
        images: [
          './350x250.png',
          'https://www.example.com/images/image.png'
        ]
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
      images (width: 300, quality: 100, blur: 0)
    }
    testPost2: testPost (id: "2") {
      image
      image2
      image3 (width: 300, quality: 100, blur: 0)
      image4
      image5
      images
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
  expect(data.testPost.images).toHaveLength(2)
  expect(data.testPost.images[0].type).toEqual('image')
  expect(data.testPost.images[0].src).toEqual('/assets/static/350x250.f14e36e.test.png')
  expect(data.testPost.images[0].size).toMatchObject({ width: 300, height: 215 })
  expect(data.testPost.images[1].type).toEqual('image')
  expect(data.testPost.images[1].src).toEqual('/assets/static/350x250.f14e36e.test.png')
  expect(data.testPost.images[1].size).toMatchObject({ width: 300, height: 215 })
  expect(data.testPost2.image).toEqual('/assets/350x250.png')
  expect(data.testPost2.image2).toEqual('https://www.example.com/images/image.png')
  expect(data.testPost2.image3).toEqual('./350x250.png')
  expect(data.testPost2.image4).toEqual('dir/to/350x250.png')
  expect(data.testPost2.image5).toEqual('350x250.png')
  expect(data.testPost2.images).toHaveLength(2)
  expect(data.testPost2.images[0]).toEqual('./350x250.png')
  expect(data.testPost2.images[1]).toEqual('https://www.example.com/images/image.png')
})

test('set background color for contain', async () => {
  const posts = api.store.addCollection('Post')

  posts.addNode({
    id: '1',
    image: './350x250.png',
    internal: {
      origin: `${context}/assets/file.md`
    }
  })

  const { errors, data } = await createSchemaAndExecute(`{
    post (id: "1") {
      image (width: 260, height: 70, fit:contain, background:"blue")
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.image.src).toEqual('/assets/static/350x250.e38261d.test.png')
  expect(data.post.image.size).toMatchObject({ width: 260, height: 70 })
})

test('process file types in schema', async () => {
  const posts = api.store.addCollection('TestPost')

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
  expect(data.testPost.file3.src).toEqual('/assets/files/dummy.test.pdf')
  expect(data.testPost.url).toEqual('https://www.gridsome.org')
  expect(data.testPost.url2).toEqual('https://www.gridsome.com')
  expect(data.testPost.text).toEqual('pdf')
})

async function createSchemaAndExecute (query, _app = app) {
  return _app.schema.buildSchema().runQuery(query)
}
