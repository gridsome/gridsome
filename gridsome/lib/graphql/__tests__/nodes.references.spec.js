const App = require('../../app/App')
const PluginAPI = require('../../app/PluginAPI')

let app, api

beforeEach(async () => {
  app = await new App('/').init()
  api = new PluginAPI(app)
})

afterAll(() => {
  app = null
  api = null
})

test('create node reference', async () => {
  const authors = api.store.addCollection('TestAuthor')

  const posts = api.store.addCollection({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  const author = authors.addNode({
    id: '2'
  })

  posts.addNode({
    id: '1',
    author: '2',
    customRefs: [
      api.store.createReference('TestAuthor', '2')
    ]
  })

  posts.addNode({
    id: '2',
    customRef: api.store.createReference(author)
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
  const { addNode } = api.store.addCollection('TestPost')

  const post = addNode({ id: '1' })

  addNode({
    id: '2',
    rel: api.store.createReference('TestPost', '1')
  })

  addNode({
    id: '3',
    rel: api.store.createReference(post)
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
  const authors = api.store.addCollection('Author')
  const posts = api.store.addCollection('Post')

  posts.addReference('author1', 'Author')
  posts.addReference('author2', { typeName: 'Author' })
  posts.addReference('authors', { typeName: 'Author' })

  authors.addNode({ id: '1', title: 'An Author' })
  authors.addNode({ id: '2', title: 'Another Author' })
  posts.addNode({ id: '1', author1: '1', author2: '1', authors: ['1'] })

  const query = `{
    post (id: "1") {
      author1 { id }
      author2 { id }
      authors { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post.author1.id).toEqual('1')
  expect(data.post.author2.id).toEqual('1')
  expect(data.post.authors).toHaveLength(1)
})

test('create missing reference fields from collection.addReference()', async () => {
  const posts = api.store.addCollection('Post')

  api.store.addCollection('Author')
  posts.addReference('author', 'Author')
  posts.addNode({ id: '1' })

  const query = `{
    post (id: "1") {
      author { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post.author).toBeNull()
})

test('don\'t process invalid refs from collection.addReference()', async () => {
  const authors = api.store.addCollection('Author')
  const posts = api.store.addCollection('Post')

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', authors: [null] })

  posts.addReference('authors', 'Author')

  const { errors, data } = await createSchemaAndExecute(`{
    post(id:"1") {
      authors {
        id
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.authors).toBeNull()
})

test('ensure reference field is a list with collection.addReference()', async () => {
  const authors = api.store.addCollection('Author')
  const posts = api.store.addCollection('Post')

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', authors: null })

  posts.addReference('authors', '[Author]')

  const { errors, data } = await createSchemaAndExecute(`{
    post(id:"1") {
      authors { id }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.authors).toHaveLength(0)
})

test('set non-null reference with collection.addReference()', async () => {
  const authors = api.store.addCollection('Author')
  const posts = api.store.addCollection('Post')

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', author: null })
  posts.addNode({ id: '2', author: '1' })
  posts.addReference('author', 'Author!')

  const { errors } = await createSchemaAndExecute(`{
    post(id:"1") {
      author { id }
    }
  }`)

  expect(errors).toHaveLength(1)
  expect(errors[0].message).toMatch('non-nullable')
})

test('proxy invalid field names in collection.addReference()', async () => {
  const authors = api.store.addCollection('Author')
  const posts = api.store.addCollection('Post')

  posts.addReference('main-author', 'Author')

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', ['main-author']: '1' })

  const query = `{
    post (id: "1") {
      main_author { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post.main_author.id).toEqual('1')
})

test('union reference with collection.addReference()', async () => {
  const authors = api.store.addCollection('Author')
  const books = api.store.addCollection('Book')
  const posts = api.store.addCollection('Post')

  authors.addReference('works', { typeName: ['Book', 'Post'] })
  authors.addReference('selected', { typeName: ['Book', 'Post'] })

  authors.addNode({ id: '1', works: ['2', '4'], selected: '2' })
  books.addNode({ id: '2', author: '1' })
  books.addNode({ id: '3' })
  posts.addNode({ id: '4', author: '1' })
  posts.addNode({ id: '5'})

  const { errors, data } = await createSchemaAndExecute(`{
    author (id: "1") {
      works { __typename }
      selected { __typename }
    }
    book(id:"2") {
      belongsTo {
        edges {
          node { __typename }
        }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.author.works).toHaveLength(2)
  expect(data.author.works[0].__typename).toEqual('Book')
  expect(data.author.works[1].__typename).toEqual('Post')
  expect(data.author.selected.__typename).toEqual('Book')
  expect(data.book.belongsTo.edges).toHaveLength(1)
  expect(data.book.belongsTo.edges[0].node.__typename).toEqual('Author')
})

test('create references with collection.addReference() and camelCased fields', async () => {
  const authors = api.store.addContentType({ typeName: 'Author', camelCasedFieldNames: true })
  const posts = api.store.addContentType({ typeName: 'Post', camelCasedFieldNames: true })

  posts.addReference('author_one', 'Author')
  posts.addReference('author_two', { typeName: 'Author' })

  authors.addNode({ id: '1', title: 'An Author' })
  posts.addNode({ id: '1', author_one: '1', author_two: '1' })

  const query = `{
    post (id: "1") {
      authorOne { id }
      authorTwo { id }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.post.authorOne.id).toEqual('1')
  expect(data.post.authorTwo.id).toEqual('1')
})

test('union reference with store.createReference()', async () => {
  const authors = api.store.addCollection('Author')
  const books = api.store.addCollection('Book')
  const posts = api.store.addCollection('Post')

  authors.addNode({
    id: '1',
    selected: api.store.createReference('Book', '2'),
    works: [
      api.store.createReference('Book', '2'),
      api.store.createReference('Post', '3')
    ]
  })
  books.addNode({ id: '2', author: api.store.createReference('Author', '1') })
  posts.addNode({ id: '3', author: api.store.createReference('Author', '1') })

  const { errors, data } = await createSchemaAndExecute(`{
    author (id: "1") {
      works {
        __typename
      }
      selected {
        __typename
      }
    }
    book(id:"2") {
      belongsTo {
        edges {
          node {
            __typename
            id
          }
        }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.author.works).toHaveLength(2)
  expect(data.author.works[0].__typename).toEqual('Book')
  expect(data.author.works[1].__typename).toEqual('Post')
  expect(data.author.selected.__typename).toEqual('Book')
  expect(data.book.belongsTo.edges).toHaveLength(1)
  expect(data.book.belongsTo.edges[0].node.__typename).toEqual('Author')
  expect(data.book.belongsTo.edges[0].node.id).toEqual('1')
})

test('create node list reference', async () => {
  const authors = api.store.addCollection({
    typeName: 'TestAuthor'
  })

  const posts = api.store.addCollection({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authors.addNode({ id: '1', title: 'A' })
  authors.addNode({ id: '2', title: 'B' })
  authors.addNode({ id: '3', title: 'C' })
  authors.addNode({ id: '4', title: 'D' })

  posts.addNode({
    id: '1',
    author: '1',
    customRefs: {
      authors: [
        { typeName: 'TestAuthor', id: '1' },
        { typeName: 'TestAuthor', id: '2' },
        { typeName: 'TestAuthor', id: '3' },
        { typeName: 'TestAuthor', id: '4' }
      ]
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
  expect(data.testPost.author.title).toEqual('A')
  expect(data.testPost.customRefs.authors).toHaveLength(2)
  expect(data.testPost.customRefs.authors[0].title).toEqual('C')
  expect(data.testPost.customRefs.authors[1].title).toEqual('B')
})

test('create node list reference with id as array', async () => {
  const authors = api.store.addCollection('TestAuthor')
  const posts = api.store.addCollection('TestPost')

  authors.addNode({ id: '2', title: 'A', sticky: false })
  authors.addNode({ id: '3', title: 'B', sticky: true })
  authors.addNode({ id: '4', title: 'C', sticky: false })

  posts.addNode({
    id: '1',
    authors: api.store.createReference('TestAuthor', ['2', '3', '4'])
  })

  const query = `{
    testPost (id: "1") {
      authors (sortBy: "title", order: ASC, limit: 2, skip: 1) {
        id
      }
      sorted: authors (sort: [{by: "sticky"}, {by: "title", order: ASC}]) {
        id
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.authors).toHaveLength(2)
  expect(data.testPost.authors[0].id).toEqual('3')
  expect(data.testPost.authors[1].id).toEqual('4')
  expect(data.testPost.sorted[0].id).toEqual('3')
  expect(data.testPost.sorted[1].id).toEqual('2')
  expect(data.testPost.sorted[2].id).toEqual('4')
})

test('create node reference to same type', async () => {
  const posts = api.store.addCollection({
    typeName: 'TestPost',
    refs: {
      related: {
        key: 'id'
      }
    }
  })

  posts.addNode({ id: '1', related: '2' })
  posts.addNode({ id: '2', title: 'Test' })

  const query = '{ testPost (id: "1") { related { id title }}}'
  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testPost.related.id).toEqual('2')
  expect(data.testPost.related.title).toEqual('Test')
})

test('create reference with multiple node types', async () => {
  const posts = api.store.addCollection({ typeName: 'TestPost' })
  const authors = api.store.addCollection({ typeName: 'TestAuthor' })
  const users = api.store.addCollection({ typeName: 'TestUser' })

  authors.addNode({ id: '1', title: 'Author', name: 'Test' })
  users.addNode({ id: '1', title: 'User', username: 'test' })
  users.addNode({ id: '2', title: 'User 2', username: 'test2' })

  posts.addNode({
    id: '3',
    people: [
      api.store.createReference('TestAuthor', '1'),
      api.store.createReference('TestUser', '1')
    ]
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

async function createSchemaAndExecute(query, _app = app) {
  return _app.schema.buildSchema().runQuery(query)
}

