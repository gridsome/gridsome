const { print, Kind } = require('graphql')
const createPageQuery = require('../createPageQuery')
const { PER_PAGE } = require('../../utils/constants')

test('parsed page-query', () => {
  const source = `query {
    allTestAuthors {
      edges {
        node {
          id
        }
      }
    }
  }`

  const query = createPageQuery(source)

  expect(query.document.kind).toEqual(Kind.DOCUMENT)
  expect(query.source).toEqual(source)
  expect(query.paginate).toBeNull()
  expect(query.context).toMatchObject({})
  expect(query.filters).toMatchObject({})
})

test('parse @paginate directive for connection', () => {
  const query = createPageQuery(`query {
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

  expect(query.paginate.typeName).toEqual('TestPost')
  expect(query.paginate.fieldName).toEqual('allTestPost')
  expect(query.paginate.perPage).toEqual(PER_PAGE)
  expect(query.paginate.belongsTo).toEqual(false)
})

test('parse @paginate with perPage variable', () => {
  const query = createPageQuery(`query ($num: Int) {
    allTestPost (perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    num: 2
  })

  expect(query.paginate.perPage).toEqual(2)
})

test('parse @paginate with perPage variable from node field', () => {
  const query = createPageQuery(`query ($num: Int) {
    allTestPost (perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    $loki: 1,
    fields: {
      num: 2
    }
  })

  expect(query.paginate.perPage).toEqual(2)
})

test('parse @paginate directive from belongsTo field', () => {
  const query = createPageQuery(`query {
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

  expect(query.paginate.typeName).toEqual('TestPage')
  expect(query.paginate.fieldName).toEqual('testPage')
  expect(query.paginate.belongsTo).toEqual(true)
  expect(query.paginate.perPage).toEqual(5)
})

test('parse filters from @paginate', () => {
  const query = createPageQuery(`query ($customVar: String) {
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
  }`, {
    customVar: 'custom var'
  })

  expect(query.filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('parse filters from @paginate with variable from node field', () => {
  const query = createPageQuery(`query ($customVar: String) {
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
  }`, {
    $loki: 1,
    fields: {
      customVar: 'custom var'
    }
  })

  expect(query.filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('remove @paginate directive from ast', () => {
  const query = createPageQuery(`query {
    allTestAuthors (perPage: 5) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(print(query.document)).not.toMatch('@paginate')
})

test('parse empty page-query', () => {
  const query = createPageQuery('  \n  ')
  expect(query.document).toBeNull()
})

test('parse invalid page-query', () => {
  const query = createPageQuery('..')
  expect(query.document).toBeNull()
})

test('parse page-query with context', () => {
  const query = createPageQuery(`query (
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
  }`, {
    $loki: 1,
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
  })

  expect(query.context.id).toEqual('1')
  expect(query.context.title).toEqual('title')
  expect(query.context.custom).toEqual('custom value')
  expect(query.context.deep__value).toEqual('deep value')
  expect(query.context.list__1__value).toEqual(2)
  expect(query.context.ref).toEqual('1')
  expect(query.context.refs__1).toEqual('2')
})
