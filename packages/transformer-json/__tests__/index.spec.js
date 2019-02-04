const JSONTransformer = require('../index')

test('parse string', async () => {
  const transformer = new JSONTransformer()
  const res = transformer.parse('"string"')

  expect(res.fields.data).toEqual('string')
})

test('parse boolean', async () => {
  const transformer = new JSONTransformer()
  const res = transformer.parse('true')

  expect(res.fields.data).toEqual(true)
})

test('parse number', async () => {
  const transformer = new JSONTransformer()
  const res = transformer.parse('5')

  expect(res.fields.data).toEqual(5)
})

test('parse array', async () => {
  const transformer = new JSONTransformer()
  const res = transformer.parse('["string"]')

  expect(res.fields.data).toHaveLength(1)
  expect(res.fields.data[0]).toEqual('string')
})

test('parse object', async () => {
  const transformer = new JSONTransformer()
  const res = transformer.parse('{ "foo": "bar" }')

  expect(res.fields.foo).toEqual('bar')
})

test('show helpful error message', async () => {
  const transformer = new JSONTransformer()
  const parse = () => transformer.parse('{ foo: "bar" }')

  expect(parse).toThrow(`while parsing near '{ foo: "bar" }'`)
})
