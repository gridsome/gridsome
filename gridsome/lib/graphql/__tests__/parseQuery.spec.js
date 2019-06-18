const App = require('../../app/App')
const { print } = require('graphql')
const PluginAPI = require('../../app/PluginAPI')
const parseQuery = require('../parseQuery')

let app

beforeEach(async () => {
  app = await new App(__dirname).init()
  const api = new PluginAPI(app)

  const contentType = api.store.addContentType('CustomContentType')
  contentType.addNode({ id: '1', path: '/test' })

  await app.createSchema()
})

test('get variable definitions', async () => {
  const query = `
    query ($foo: String, $foo__bar: Int = 5) {
      customContentType(id: $foo)
    }
  `

  const res = parseQuery(app.schema.getSchema(), query)

  expect(res.variables).toHaveLength(2)
  expect(res.variables[0]).toMatchObject({ name: 'foo', defaultValue: null, path: ['foo'] })
  expect(res.variables[1]).toMatchObject({ name: 'foo__bar', defaultValue: 5, path: ['foo', 'bar'] })
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

  test('remove @paginate directive from ast', () => {
    const query = `
      query {
        allCustomContentType(perPage: 5) @paginate {
          edges {
            node {
              id
            }
          }
        }
      }
    `

    const res = parseQuery(app.schema.getSchema(), query)

    expect(print(res.document)).not.toMatch('@paginate')
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

describe('transform incorrect queries', () => {
  test('transform String to ID', () => {
    const query = `
      query ($id: String!) {
        customContentType(id: $id)
      }
    `

    const res = parseQuery(app.schema.getSchema(), query)

    expect(print(res.document)).toMatch('($id: ID!)')
  })
})
