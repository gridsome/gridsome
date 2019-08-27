const YamlTransformer = require('../index')

test('parse string', async () => {
  const transformer = new YamlTransformer()
  const res = transformer.parse('string')

  expect(res.data).toEqual('string')
})

test('parse boolean', async () => {
  const transformer = new YamlTransformer()
  const res = transformer.parse('true')

  expect(res.data).toEqual(true)
})

test('parse number', async () => {
  const transformer = new YamlTransformer()
  const res = transformer.parse('5')

  expect(res.data).toEqual(5)
})

test('parse list', async () => {
  const transformer = new YamlTransformer()
  const res = transformer.parse('- string')

  expect(res.data).toHaveLength(1)
  expect(res.data[0]).toEqual('string')
})

test('parse object', async () => {
  const transformer = new YamlTransformer()
  const res = transformer.parse('foo: bar')

  expect(res.foo).toEqual('bar')
})
