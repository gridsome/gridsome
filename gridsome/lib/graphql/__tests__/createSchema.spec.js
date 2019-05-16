const App = require('../../app/App')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('add custom GraphQL object types', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      store.addContentType('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value'
      })
    })

    api.createSchema(({ addTypes, createObjectType }) => {
      addTypes([
        createObjectType({
          name: 'Author',
          fields: {
            name: 'String'
          }
        }),
        createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            id: 'ID!',
            author: {
              type: 'Author',
              resolve: () => ({ name: 'The Author' })
            }
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      content
      author {
        name
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.content).toEqual('Value')
  expect(data.post.author).toMatchObject({ name: 'The Author' })
})

test('add custom GraphQL types from SDL', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      store.addContentType('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value'
      })
    })

    api.createSchema(({ addTypes, addResolvers }) => {
      addTypes(`
        type Author {
          name: String
        }
        type Post implements Node {
          id: ID!
          author: Author
        }
      `)

      addResolvers({
        Post: {
          author: {
            resolve: () => ({ name: 'The Author' })
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      content
      author {
        name
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.content).toEqual('Value')
  expect(data.post.author).toMatchObject({ name: 'The Author' })
})

test('add custom resolver for invalid field names', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      store.addContentType('Post').addNode({
        id: '1',
        '123': 4,
        '456-test': 4,
        '789-test': 10
      })
    })

    api.createSchema(({ addTypes, addResolvers, createObjectType }) => {
      addTypes([
        createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            id: 'ID!',
            _123: {
              type: 'Int',
              resolve: obj => obj['123'] + 6
            }
          }
        })
      ])

      addResolvers({
        Post: {
          _456_test: {
            resolve: obj => obj['456-test'] + 6
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      _123
      _456_test
      _789_test
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post._123).toEqual(10)
  expect(data.post._456_test).toEqual(10)
  expect(data.post._789_test).toEqual(10)
})

test('add custom resolvers for content type', async () => {
  const app = await createApp(function (api) {
    api.loadSource(store => {
      const posts = store.addContentType('Post')
      posts.addNode({ id: '1', title: 'My Post' })
    })
    api.createSchema(({ addResolvers }) => {
      addResolvers({
        Post: {
          customField: {
            type: 'String',
            resolve () {
              return 'value'
            }
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      customField
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.customField).toEqual('value')
})

test('add custom GraphQL schema', async () => {
  const app = await createApp(function (api) {
    api.createSchema(({ addSchema, graphql }) => {
      addSchema(new graphql.GraphQLSchema({
        query: new graphql.GraphQLObjectType({
          name: 'CustomRootQuery',
          fields: {
            customRootValue: {
              type: graphql.GraphQLString,
              args: {
                append: {
                  type: graphql.GraphQLString,
                  defaultValue: 'foo'
                }
              },
              resolve: (_, args) => 'custom value ' + args.append
            }
          }
        })
      }))
    })
  })

  const { errors, data } = await app.graphql(`{
    value1: customRootValue
    value2: customRootValue(append:"bar")
  }`)

  expect(errors).toBeUndefined()
  expect(data.value1).toEqual('custom value foo')
  expect(data.value2).toEqual('custom value bar')
})

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
