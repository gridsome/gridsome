const parsePageQuery = require('../lib/graphql/parsePageQuery')

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

  expect(paginate.fieldName).toEqual('allTestPost')
  expect(paginate.typeName).toEqual('TestPost')
  expect(paginate.perPage).toEqual(5)
})

test('parse @paginate directive for single type', () => {
  const { paginate } = parsePageQuery({
    type: 'TestPage',
    content: `query {
      testPage (perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }`
  })

  expect(paginate.fieldName).toEqual('testPage')
  expect(paginate.typeName).toEqual('TestPage')
  expect(paginate.perPage).toEqual(5)
})
