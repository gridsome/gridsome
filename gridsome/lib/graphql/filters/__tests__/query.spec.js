const { toFilterArgs } = require('../query')
const initMustHaveTypes = require('../../types')
const { createFilterInput } = require('../input')
const { SchemaComposer } = require('graphql-compose')

test('convert filters to Loki query', () => {
  const inputTypeComposer = createInputTypeComposer(`
    type Post implements Node {
      title: String
      author: String
    }
  `)

  const query = toFilterArgs({
    title: { eq: 'Test' },
    author: { in: ['1', '2'] }
  }, inputTypeComposer)

  expect(query.title).toMatchObject({ $eq: 'Test' })
  expect(query.author).toMatchObject({ $in: ['1', '2'] })
})

test('convert deep objects to dot notation (single)', () => {
  const [,,,post] = createTypes([
    `type Three { four: String! }`,
    `type Two { three: Three }`,
    `type One { two: Two }`,
    `type Post implements Node { one: One }`
  ])

  const query = toFilterArgs({
    one: { two: { three: { four: { in: ['1', '2'] } } } }
  }, post.getInputTypeComposer())

  expect(query['one.two.three.four']).toMatchObject({ '$in': ['1', '2'] })
})

test('convert deep objects to dot notation (list)', () => {
  const [, , , post] = createTypes([
    `type Three { four: [String] }`,
    `type Two { three: Three }`,
    `type One { two: Two }`,
    `type Post implements Node { one: One }`
  ])

  const query = toFilterArgs({
    one: { two: { three: { four: { contains: '1' } } } }
  }, post.getInputTypeComposer())

  expect(query['one.two.three.four']).toMatchObject({ '$contains': '1' })
})

test('convert proxied filters to Loki query', () => {
  const inputTypeComposer = createInputTypeComposer(`
    type Post implements Node {
      proxyValue: String @proxy(from:"field-name")
    }
  `)

  const query = toFilterArgs({
    proxyValue: { eq: 'Test' }
  }, inputTypeComposer)

  expect(query['field-name']).toMatchObject({ $eq: 'Test' })
  expect(query.proxyValue).toBeUndefined()
})

test('use custom loki operators for node references (single)', () => {
  const [, post] = createTypes([
    `type Author implements Node {
      id: ID!
    }`,
    `type Post implements Node {
      author: Author!
      authors: [Author]!
    }`
  ])

  const itc = post.getInputTypeComposer()

  const query1 = toFilterArgs({ author: { id: { eq: '1' } } }, itc)
  const query2 = toFilterArgs({ author: { id: { ne: '1' } } }, itc)
  const query3 = toFilterArgs({ author: { id: { in: ['1'] } } }, itc)
  const query4 = toFilterArgs({ author: { id: { nin: ['1'] } } }, itc)
  const query5 = toFilterArgs({ author: { id: { exists: false } } }, itc)

  expect(query1).toMatchObject({ author: { '$refEq': '1' } })
  expect(query2).toMatchObject({ author: { '$refNe': '1' } })
  expect(query3).toMatchObject({ author: { '$refIn': ['1'] } })
  expect(query4).toMatchObject({ author: { '$refNin': ['1'] } })
  expect(query5).toMatchObject({ author: { '$refExists': false } })
})

test('use custom loki operators for node references (list)', () => {
  const [, post] = createTypes([
    `type Author implements Node {
      id: ID!
    }`,
    `type Post implements Node {
      authors: [Author]!
    }`
  ])

  const itc = post.getInputTypeComposer()

  const query1 = toFilterArgs({ authors: { id: { eq: '1' } } }, itc)
  const query2 = toFilterArgs({ authors: { id: { ne: '1' } } }, itc)
  const query3 = toFilterArgs({ authors: { id: { in: ['1'] } } }, itc)
  const query4 = toFilterArgs({ authors: { id: { nin: ['1'] } } }, itc)
  const query5 = toFilterArgs({ authors: { id: { exists: false } } }, itc)

  expect(query1).toMatchObject({ authors: { '$refListEq': '1' } })
  expect(query2).toMatchObject({ authors: { '$refListNe': '1' } })
  expect(query3).toMatchObject({ authors: { '$refListIn': ['1'] } })
  expect(query4).toMatchObject({ authors: { '$refListNin': ['1'] } })
  expect(query5).toMatchObject({ authors: { '$refListExists': false } })
})

function createInputTypeComposer (config) {
  const schemaComposer = new SchemaComposer()
  const typeComposer = schemaComposer.createObjectTC(config)

  initMustHaveTypes(schemaComposer)
  createFilterInput(schemaComposer, typeComposer)

  return typeComposer.getInputTypeComposer()
}

function createTypes (types) {
  const schemaComposer = new SchemaComposer()

  initMustHaveTypes(schemaComposer)

  return types.map(type => {
    const typeComposer = schemaComposer.createObjectTC(type)
    createFilterInput(schemaComposer, typeComposer)
    return typeComposer
  })
}
