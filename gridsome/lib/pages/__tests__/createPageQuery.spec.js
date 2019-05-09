const { print, Kind } = require('graphql')
const createPageQuery = require('../createPageQuery')

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
  expect(query.variables).toMatchObject({})
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
  expect(query.paginate.perPage).toBeUndefined()
  expect(query.paginate.belongsTo).toEqual(null)
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

test('parse @paginate with skip', () => {
  const query = createPageQuery(`query {
    allTestPost (skip: 10) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(query.paginate.skip).toEqual(10)
})

test('parse @paginate with limit', () => {
  const query = createPageQuery(`query {
    allTestPost (limit: 10) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(query.paginate.limit).toEqual(10)
})

test('parse @paginate with limit and skip from variables', () => {
  const query = createPageQuery(`query ($limit: Int, $skip: Int) {
    allTestPost (limit: $limit, skip: $skip) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    limit: 2,
    skip: 10
  })

  expect(query.paginate.limit).toEqual(2)
  expect(query.paginate.skip).toEqual(10)
})

test('do not get page variable from context', () => {
  const query = createPageQuery(`query ($page: Int) {
    allTestPost (page: $page) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    page: 3
  })

  expect(query.variables.page).toBeUndefined()
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
    num: 2
  })

  expect(query.paginate.perPage).toEqual(2)
})

test('parse @paginate with perPage default value', () => {
  const query = createPageQuery(`query ($num: Int = 5) {
    allTestPost (perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    $loki: 1
  })

  expect(query.paginate.perPage).toEqual(5)
})

test('parse @paginate directive from belongsTo field with id', () => {
  const query = createPageQuery(`query {
    testPage (id: "1") {
      belongsTo (perPage: 5, skip: 1, limit: 10) @paginate {
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
  expect(query.paginate.belongsTo).toMatchObject({ id: '1' })
  expect(query.paginate.perPage).toEqual(5)
  expect(query.paginate.limit).toEqual(10)
  expect(query.paginate.skip).toEqual(1)
})

test('parse @paginate directive from belongsTo field with path and alias', () => {
  const query = createPageQuery(`query {
    post: testPage (path: "/2019/03/28/hello-world") {
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
  expect(query.paginate.belongsTo).toMatchObject({ path: '/2019/03/28/hello-world' })
  expect(query.paginate.perPage).toEqual(5)
})

test('parse @paginate directive from belongsTo field with variable', () => {
  const query = createPageQuery(`query ($post: String!, $limit: Int!) {
    post (id: $post) {
      belongsTo (perPage: $limit) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`, {
    post: '2',
    limit: 10
  })

  expect(query.paginate.typeName).toEqual('Post')
  expect(query.paginate.fieldName).toEqual('post')
  expect(query.paginate.belongsTo).toMatchObject({ id: '2' })
  expect(query.paginate.perPage).toEqual(10)
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
    customVar: 'custom var'
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
})
