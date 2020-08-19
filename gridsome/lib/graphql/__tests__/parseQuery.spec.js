const App = require('../../app/App')
const { print } = require('graphql')
const PluginAPI = require('../../app/PluginAPI')
const parseQuery = require('../parseQuery')

let app

beforeEach(async () => {
  app = await new App(__dirname).init()
  const api = new PluginAPI(app)

  api.createSchema(({ addSchema, GraphQLSchema, GraphQLObjectType, GraphQLList, GraphQLInt }) => {
    addSchema(new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: () => ({
          customField: {
            type: GraphQLInt,
            args: {
              id: { type: new GraphQLList(GraphQLInt) }
            },
            resolve: (obj, args) => args.id[0]
          }
        })
      })
    }))
  })

  const collection = api.store.addCollection('CustomContentType')
  collection.addNode({ id: '1', path: '/test' })

  await app.plugins.createSchema()
})

test('get variable definitions', async () => {
  const query = `
    query ($foo: String, $foo__bar: Int = 5) {
      customContentType(id: $foo)
    }
  `

  const res = parseQuery(app.schema.getSchema(), query)

  expect(res.variables).toHaveLength(2)
  expect(res.variables[0]).toMatchObject({
    name: 'foo',
    defaultValue: undefined,
    path: ['foo']
  })
  expect(res.variables[1]).toMatchObject({
    name: 'foo__bar',
    defaultValue: 5,
    path: ['foo', 'bar']
  })
})

describe('pagination with @paginate directive', () => {
  test('get @paginate directive info', async () => {
    const query = `
      query {
        custom: allCustomContentType(perPage: 5) @paginate {
          edges {
            node
          }
        }
      }
    `

    const res = parseQuery(app.schema.getSchema(), query)

    expect(res.directives.paginate.belongsToArgs).toBeNull()
    expect(res.directives.paginate.typeName).toEqual('CustomContentType')
    expect(res.directives.paginate.fieldName).toEqual('allCustomContentType')
    expect(res.directives.paginate.args).toHaveProperty('perPage')
    expect(res.directives.paginate.args.perPage.value).toEqual('5')
  })
})

describe('pagination belongsTo with @paginate directive', () => {
  test('get @paginate directive info for belongsTo', async () => {
    const query = `
      query {
        customContentType(id: "1", path: { eq: "/test" }) {
          belongsTo(perPage: 5) @paginate {
            edges {
              item: node {
                ... on Node {
                  id
                }
              }
            }
          }
        }
      }
    `

    const res = parseQuery(app.schema.getSchema(), query)

    expect(res.directives.paginate.typeName).toEqual('CustomContentType')
    expect(res.directives.paginate.fieldName).toEqual('customContentType')
    expect(res.directives.paginate.belongsToArgs).toHaveProperty('id')
    expect(res.directives.paginate.belongsToArgs).toHaveProperty('path')
    expect(res.directives.paginate.args).toHaveProperty('perPage')
    expect(res.directives.paginate.args.perPage.value).toEqual('5')
  })
})

describe('give useful error messages', () => {
  test('for missing field type', async () => {
    const query = `
      query {
        missingType(perPage: 5) @paginate {
          edges {
            node {
              id
            }
          }
        }
      }
    `

    expect(() => parseQuery(app.schema.getSchema(), query)).toThrow(
      `Cannot use @paginate on the 'missingType' field.`
    )
  })

  test('for field not a node collection', async () => {
    const query = `
      query {
        page(path: "/") @paginate {
          path
        }
      }
    `

    expect(() => parseQuery(app.schema.getSchema(), query)).toThrow(`Cannot use @paginate on the 'page' field`)
  })
})

// TODO: remove this in 0.8
describe('transform incorrect variables', () => {
  test('transform String to ID for collection fields', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: String!) {
        customContentType(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: ID!)')
  })

  test('transform String to ID for collection fields', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: String) {
        customContentType(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: ID)')
  })

  test('transform String to ID for collection fields', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: Int) {
        customContentType(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: ID)')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: Int) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: Int)')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: Int!) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: Int!)')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: [Int]) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: [Int])')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: [Int]!) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: [Int]!)')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: [Int!]) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: [Int!])')
  })

  test('don\'t transform incorrect variables for other types', () => {
    const res = parseQuery(app.schema.getSchema(), `
      query ($id: [Int!]!) {
        customField(id: $id)
      }
    `)

    expect(print(res.document)).toMatch('($id: [Int!]!)')
  })
})
