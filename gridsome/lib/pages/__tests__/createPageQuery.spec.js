const App = require('../../app/App')
const { Kind } = require('graphql')
const PluginAPI = require('../../app/PluginAPI')
const createPageQuery = require('../createPageQuery')
const { PER_PAGE } = require('../../utils/constants')
const parseQuery = require('../../graphql/parseQuery')

let app

beforeEach(async () => {
  app = await new App(__dirname).init()
  const api = new PluginAPI(app)

  api.store.addCollection('TestPost')

  await app.plugins.createSchema()
})

test('parsed page-query', async () => {
  const source = `query {
    allTestPost {
      edges {
        node {
          id
        }
      }
    }
  }`

  const parsed = parseQuery(app.schema.getSchema(), source)
  const query = createPageQuery(parsed)

  expect(query.document.kind).toEqual(Kind.DOCUMENT)
  expect(query.source).toEqual(source)
  expect(query.paginate).toBeNull()
  expect(query.variables).toMatchObject({})
  expect(query.filters).toMatchObject({})
})

test('parse @paginate directive for connection', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query {
    allTestAuthors {
      edges {
        node {
          id
        }
      }
    }
    pages: allTestPost @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed)

  expect(query.paginate.typeName).toEqual('TestPost')
  expect(query.paginate.fieldName).toEqual('allTestPost')
  expect(query.paginate.belongsToArgs).toBeNull()
})

test('parse @paginate with perPage variable', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query ($num: Int) {
    allTestPost(perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed, { num: 2 })

  expect(query.paginate.args.perPage).toEqual(2)
})

test('do not get page variable from context', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query ($page: Int) {
    allTestPost(page: $page) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed, { page: 3 })

  expect(query.paginate.args.page).toBeUndefined()
})

test('parse @paginate with perPage default value', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query {
    allTestPost @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed)

  expect(query.paginate.args.perPage).toEqual(PER_PAGE)
})

test('parse @paginate with perPage default inline value', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query ($num: Int = 5) {
    allTestPost(perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed)

  expect(query.paginate.args.perPage).toEqual(5)
})

test('parse @paginate directive from belongsTo field with id', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query {
    testPost(id: "1") {
      belongsTo(perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`)

  const query = createPageQuery(parsed)

  expect(query.paginate.typeName).toEqual('TestPost')
  expect(query.paginate.fieldName).toEqual('testPost')
  expect(query.paginate.belongsToArgs.id).toEqual('1')
  expect(query.paginate.args.perPage).toEqual(5)
})

test('parse @paginate directive from belongsTo field with path and alias', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query {
    post: testPost(path: "/2019/03/28/hello-world") {
      belongsTo(perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`)

  const query = createPageQuery(parsed)

  expect(query.paginate.typeName).toEqual('TestPost')
  expect(query.paginate.fieldName).toEqual('testPost')
  expect(query.paginate.belongsToArgs).toMatchObject({ path: '/2019/03/28/hello-world' })
  expect(query.paginate.args.perPage).toEqual(5)
})

test('parse @paginate directive from belongsTo field with variable', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query ($post: String!, $limit: Int!) {
    testPost(id: $post) {
      belongsTo(perPage: $limit) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`)

  const query = createPageQuery(parsed, {
    post: '2',
    limit: 10
  })

  expect(query.paginate.typeName).toEqual('TestPost')
  expect(query.paginate.fieldName).toEqual('testPost')
  expect(query.paginate.belongsToArgs).toMatchObject({ id: '2' })
  expect(query.paginate.args.perPage).toEqual(10)
})

test('parse filters from @paginate', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query ($customVar: String) {
    pages: allTestPost (
      filter: {
        myField: { eq: $customVar }
        num: { gt: 2 }
      }
    ) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  const query = createPageQuery(parsed, {
    customVar: 'custom var'
  })

  expect(query.paginate.args.filter).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('parse empty page-query', () => {
  const query = createPageQuery(parseQuery(app.schema.getSchema(), '  \n  '))
  expect(query.document).toBeNull()
})

test('parse invalid page-query', () => {
  const query = createPageQuery(parseQuery(app.schema.getSchema(), '..'))
  expect(query.document).toBeNull()
})

test('parse page-query with context', () => {
  const parsed = parseQuery(app.schema.getSchema(), `query (
    $page: Int
    $path: String
    $unknown: String
    $id: String
    $title: String
    $custom: String
    $deep__value: String
    $list__1__value: Int
    $ref: String
    $refs__1: String
  ) {
    testPost {
      id
    }
  }`)

  const query = createPageQuery(parsed, {
    $loki: 1,
    id: '1',
    title: 'title',
    custom: 'custom value',
    deep: {
      value: 'deep value'
    },
    list: [{ value: 1 }, { value: 2 }, { value: 3 }],
    ref: { typeName: 'Post', id: '1' },
    refs: [
      { typeName: 'Post', id: '1' },
      { typeName: 'Post', id: '2' }
    ]
  })

  expect(query.variables.id).toEqual('1')
  expect(query.variables.title).toEqual('title')
  expect(query.variables.custom).toEqual('custom value')
  expect(query.variables.deep__value).toEqual('deep value')
  expect(query.variables.list__1__value).toEqual(2)
  expect(query.variables.ref).toEqual('1')
  expect(query.variables.refs__1).toEqual('2')
  expect(query.variables.unknown).toBeUndefined()
})
