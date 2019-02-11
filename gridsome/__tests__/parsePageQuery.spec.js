const { print } = require('graphql')
const queryVariables = require('../lib/graphql/utils/queryVariables')
const parsePageQuery = require('../lib/graphql/utils/parsePageQuery')

test('parse page query', () => {
  const parsed = parsePageQuery({
    content: `query {
      allTestAuthors {
        edges {
          node {
            id
          }
        }
      }
    }`
  })

  expect(parsed.variables).toHaveLength(0)
  expect(parsed.paginate.typeName).toBeUndefined()
  expect(parsed.paginate.fieldName).toBeUndefined()
  expect(parsed.paginate.perPage).toBeInstanceOf(Function)
  expect(parsed.paginate.createFilters).toBeInstanceOf(Function)
})

test('parse @paginate directive for connection', () => {
  const { paginate } = parsePageQuery({
    content: `query {
      allTestAuthors {
        edges {
          node {
            id
          }
        }
      }
      pages: allTestPost (perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }`
  })

  expect(paginate.typeName).toEqual('TestPost')
  expect(paginate.fieldName).toEqual('allTestPost')
  expect(paginate.perPage).toBeInstanceOf(Function)
  expect(paginate.perPage()).toEqual(5)
})

test('parse @paginate directive from belongsTo field', () => {
  const { paginate } = parsePageQuery({
    type: 'TestPage',
    content: `query {
      testPage {
        belongsTo (perPage: 5) @paginate {
          edges {
            node {
              id
            }
          }
        }
      }
    }`
  })

  expect(paginate.typeName).toEqual('TestPage')
  expect(paginate.fieldName).toEqual('testPage')
  expect(paginate.perPage()).toEqual(5)
})

test('parse filters from @paginate field', () => {
  const { paginate } = parsePageQuery({
    content: `query ($customVar: String) {
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
    }`
  })

  expect(paginate.createFilters).toBeInstanceOf(Function)

  const filters = paginate.createFilters({
    customVar: 'custom var'
  })

  expect(filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('remove @paginate directive from ast', () => {
  const result = parsePageQuery({
    content: `query {
      allTestAuthors (perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }`
  })

  expect(print(result.query)).not.toMatch('@paginate')
})

test('parse query variables', () => {
  const { variables } = parsePageQuery({
    content: `query (
      $page: Int
      $path: String
      $title: String
      $custom: String
      $deep__value: String
      $list__1__value: Int
      $ref: String
      $refs__1: String
    ) {
      testAuthor {
        id
      }
    }`
  })

  const values = queryVariables({
    title: 'title',
    fields: {
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
    }
  }, variables)

  expect(variables).toHaveLength(6)
  expect(values.title).toEqual('title')
  expect(values.custom).toEqual('custom value')
  expect(values.deep__value).toEqual('deep value')
  expect(values.list__1__value).toEqual(2)
  expect(values.ref).toEqual('1')
  expect(values.refs__1).toEqual('2')
})
