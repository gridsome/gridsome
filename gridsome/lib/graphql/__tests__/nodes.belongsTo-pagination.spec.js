const App = require('../../app/App')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('should return all nodes', async () => {
  const results = await graphql('1', 100)

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(100)
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 100,
    totalPages: 1,
    currentPage: 1,
    totalItems: 100,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('should return empty results', async () => {
  const results = await graphql('1', 0)

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(0)
  expect(results.data.tag.belongsTo.edges).toHaveLength(0)
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 0,
    totalPages: 1,
    currentPage: 1,
    totalItems: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('return limited nodes', async () => {
  const results = await graphql('1', 100, 'limit: 10')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(10)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('1')
  expect(results.data.tag.belongsTo.edges[9].node.id).toEqual('10')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 10,
    totalPages: 1,
    currentPage: 1,
    totalItems: 10,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('skip nodes', async () => {
  const results = await graphql('1', 100, 'skip: 95')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(5)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('96')
  expect(results.data.tag.belongsTo.edges[4].node.id).toEqual('100')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 5,
    totalPages: 1,
    currentPage: 1,
    totalItems: 5,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('limit and skip', async () => {
  const results = await graphql('1', 100, 'limit: 10', 'skip: 10')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(10)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('11')
  expect(results.data.tag.belongsTo.edges[9].node.id).toEqual('20')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 10,
    totalPages: 1,
    currentPage: 1,
    totalItems: 10,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('limit and skip is more than total nodes', async () => {
  const results = await graphql('1', 100, 'limit: 10', 'skip: 95')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(5)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('96')
  expect(results.data.tag.belongsTo.edges[4].node.id).toEqual('100')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 10,
    totalPages: 1,
    currentPage: 1,
    totalItems: 5,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('limit results with perPage argument', async () => {
  const results = await graphql('1', 100, 'perPage: 10')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(10)
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 10,
    totalPages: 1,
    currentPage: 1,
    totalItems: 10,
    hasPreviousPage: false,
    hasNextPage: false,
    isFirst: true,
    isLast: true
  })
})

test('return specific page', async () => {
  const results = await graphql('1', 100, 'page: 2')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(25)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('26')
  expect(results.data.tag.belongsTo.edges[24].node.id).toEqual('50')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 25,
    totalPages: 4,
    currentPage: 2,
    totalItems: 100,
    hasPreviousPage: true,
    hasNextPage: true,
    isFirst: false,
    isLast: false
  })
})

test('return specific page within limit', async () => {
  const results = await graphql('1', 100, 'page: 1', 'limit: 50')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(25)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('1')
  expect(results.data.tag.belongsTo.edges[24].node.id).toEqual('25')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 25,
    totalPages: 2,
    currentPage: 1,
    totalItems: 50,
    hasPreviousPage: false,
    hasNextPage: true,
    isFirst: true,
    isLast: false
  })
})

test('return specific page within limit with custom perPage', async () => {
  const results = await graphql('1', 100, 'page: 5', 'perPage: 3', 'limit: 50')

  expect(results.errors).toBeUndefined()
  expect(results.data.tag.belongsTo.totalCount).toEqual(100)
  expect(results.data.tag.belongsTo.edges).toHaveLength(3)
  expect(results.data.tag.belongsTo.edges[0].node.id).toEqual('13')
  expect(results.data.tag.belongsTo.edges[2].node.id).toEqual('15')
  expect(results.data.tag.belongsTo.pageInfo).toMatchObject({
    perPage: 3,
    totalPages: 17,
    currentPage: 5,
    totalItems: 50,
    hasPreviousPage: true,
    hasNextPage: true,
    isFirst: false,
    isLast: false
  })
})

async function graphql (id, count, ...args) {
  const defaultSort = 'sort: [{ by: "order", order: ASC }]'
  const argsArr = [...args, defaultSort]

  const app = await new App(__dirname, {
    localConfig: {
      plugins: [
        function plugin (api) {
          api.loadSource(store => {
            const posts = store.addCollection('Post')
            const tags = store.addCollection('Tag')

            tags.addNode({ id: '1' })
            tags.addNode({ id: '2' })

            for (let i = 1; i <= count; i++) {
              posts.addNode({
                id: String(i),
                order: i,
                tag: store.createReference('Tag', '1')
              })
            }

            for (let i = 1; i <= 10; i++) {
              posts.addNode({
                id: String(i),
                tag: store.createReference('Tag', '2')
              })
            }
          })
        }
      ]
    }
  })

  await app.bootstrap(BOOTSTRAP_PAGES)

  return app.graphql(`{
    tag(id: "${id}") {
      id
      belongsTo(${argsArr.join(', ')}) {
        totalCount
        pageInfo {
          perPage
          totalPages
          totalItems
          currentPage
          hasPreviousPage
          hasNextPage
          isFirst
          isLast
        }
        edges {
          node {
            ... on Node { id }
          }
        }
      }
    }
  }`)
}
