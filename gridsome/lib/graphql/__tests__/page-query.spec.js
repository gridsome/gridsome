const { print } = require('graphql')
const { PER_PAGE } = require('../../utils/constants')

const {
  contextValues,
  parsePageQuery,
  processPageQuery
} = require('../page-query')

test('parse page-query', () => {
  const query = `query {
    allTestAuthors {
      edges {
        node {
          id
        }
      }
    }
  }`

  const parsed = parsePageQuery(query)

  expect(parsed.query).toEqual(query)
  expect(parsed.paginate).toEqual(false)
})

test('parse empty page-query', () => {
  const parsed = parsePageQuery('  \n  ')

  expect(parsed.query).toEqual(null)
  expect(parsed.paginate).toEqual(false)
})

test('parse invalid page-query', () => {
  const parsed = parsePageQuery('..')

  expect(parsed.query).toEqual(null)
  expect(parsed.paginate).toEqual(false)
})

test('parse @paginate directive for connection', () => {
  const parsed = parsePageQuery(`query {
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

  const processed = processPageQuery(parsed)

  expect(parsed.paginate).toEqual(true)
  expect(processed.paginate.typeName).toEqual('TestPost')
  expect(processed.paginate.fieldName).toEqual('allTestPost')
  expect(processed.getPerPage()).toEqual(PER_PAGE)
})

test('parse @paginate directive from belongsTo field', () => {
  const processed = parseAndProcess(`query {
    testPage {
      belongsTo (perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`)

  expect(processed.paginate.typeName).toEqual('TestPage')
  expect(processed.paginate.fieldName).toEqual('testPage')
  expect(processed.getPerPage()).toEqual(5)
})

test('parse filters from @paginate field', () => {
  const processed = parseAndProcess(`query ($customVar: String) {
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

  const filters = processed.getFilters({
    customVar: 'custom var'
  })

  expect(filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('remove @paginate directive from ast', () => {
  const processed = parseAndProcess(`query {
    allTestAuthors (perPage: 5) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(print(processed.query)).not.toMatch('@paginate')
})

test('parse page-query variables', () => {
  const { variables } = parseAndProcess(`query (
    $page: Int
    $path: String
    $id: String
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
  }`)

  const values = contextValues({
    id: '1',
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

  expect(variables).toHaveLength(7)
  expect(values.id).toEqual('1')
  expect(values.title).toEqual('title')
  expect(values.custom).toEqual('custom value')
  expect(values.deep__value).toEqual('deep value')
  expect(values.list__1__value).toEqual(2)
  expect(values.ref).toEqual('1')
  expect(values.refs__1).toEqual('2')
})

function parseAndProcess (query) {
  const parsed = parsePageQuery(query)
  return processPageQuery(parsed)
}

