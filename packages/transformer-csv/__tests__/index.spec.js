const CSVTransformer = require('../index')

test('parse valid csv', async () => {
  const transformer = new CSVTransformer()
  const res = transformer.parse(`header 1,header 2
item 1,item 2
item 3,item 4`)

  expect(res.records).toEqual([
    { 'header 1': 'item 1', 'header 2': 'item 2' },
    { 'header 1': 'item 3', 'header 2': 'item 4' }
  ])
})

test('parse csv with empty lines', async () => {
  const transformer = new CSVTransformer()
  const res = transformer.parse(`header 1,header 2

item 1,item 2



item 3,item 4`)

  expect(res.records).toEqual([
    { 'header 1': 'item 1', 'header 2': 'item 2' },
    { 'header 1': 'item 3', 'header 2': 'item 4' }
  ])
})

test('parse csv with quotes', async () => {
  const transformer = new CSVTransformer()
  const res = transformer.parse(`"header 1","header 2"
item 1,"item 2"
"""item"" 3","item 4, item 4.5"`)

  expect(res.records).toEqual([
    { 'header 1': 'item 1', 'header 2': 'item 2' },
    { 'header 1': '"item" 3', 'header 2': 'item 4, item 4.5' }
  ])
})

test('parse csv with whitespace', async () => {
  const transformer = new CSVTransformer()
  const res = transformer.parse(`header 1,header 2
item 1,   item 2
item 3    ,item 4  `)

  expect(res.records).toEqual([
    { 'header 1': 'item 1', 'header 2': '   item 2' },
    { 'header 1': 'item 3    ', 'header 2': 'item 4  ' }
  ])
})

test('parse csv with invalid quotes and whitespace', async () => {
  const transformer = new CSVTransformer()
  const parse = () => transformer.parse(`header 1,header 2
item 1,   "item 2"`)

  expect(parse).toThrow()
})
