const { print } = require('graphql')
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
  expect(paginate.fieldName).toEqual('allTestPost')
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
  expect(paginate.fieldName).toEqual('testPage')
  expect(paginate.perPage).toEqual(5)
})

test('parse filters from @paginate field', () => {
  const { paginate } = parsePageQuery({
    content: `query {
      pages: allTestPost (filter: { num: { gt: 2 }}) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }`
  })

  expect(paginate.filter).toMatchObject({ num: { gt: 2 }})
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
