const { print } = require('graphql')
const queryVariables = require('../lib/graphql/utils/queryVariables')
const parsePageQuery = require('../lib/graphql/utils/parsePageQuery')

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
  expect(paginate.perPage).toEqual(5)
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
  expect(paginate.perPage).toEqual(5)
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
