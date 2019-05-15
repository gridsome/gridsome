const App = require('../../app/App')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('add custom resolvers for node fields', async () => {
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

test('add custom graphql schema', async () => {
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
