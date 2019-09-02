const { toFilterArgs } = require('../query')
const initMustHaveTypes = require('../../types')
const { createFilterInput } = require('../input')
const { SchemaComposer } = require('graphql-compose')
const { addObjectTypeExtensions } = require('../../utils')

test('convert filters to Loki query', () => {
  const inputTypeComposer = createTypeComposer(`
    type Post implements Node {
      title: String
      author: String
    }
  `).getInputTypeComposer()

  const query = toFilterArgs({
    title: { eq: 'Test' },
    author: { in: ['1', '2'] }
  }, inputTypeComposer)

  expect(query.title).toMatchObject({ $eq: 'Test' })
  expect(query.author).toMatchObject({ $in: ['1', '2'] })
})

test('convert proxied filters to Loki query', () => {
  const inputTypeComposer = createTypeComposer(`
    type Post implements Node {
      proxyValue: String @proxy(from:"field-name")
    }
  `).getInputTypeComposer()

  const query = toFilterArgs({
    proxyValue: { eq: 'Test' }
  }, inputTypeComposer)

  expect(query['field-name']).toMatchObject({ $eq: 'Test' })
  expect(query.proxyValue).toBeUndefined()
})

function createTypeComposer (config) {
  const schemaComposer = new SchemaComposer()
  const typeComposer = schemaComposer.createObjectTC(config)

  initMustHaveTypes(schemaComposer)
  addObjectTypeExtensions(typeComposer)
  createFilterInput(schemaComposer, typeComposer)

  return typeComposer
}
