const App = require('../../app/App')

test('filter by multiple ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { id: { in: ["2", "3"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter number by between', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { price: { between: [120, 150] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('filter number by gt', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { price: { gt: 120 } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter list by contains', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { contains: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
})

test('filter list by containsAny', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { containsAny: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(3)
})

test('filter list by containsNone', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { containsNone: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
})

test('filter list by regex', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { title: { regex: "Do[l|j]or" } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
})

test('filter list by boolean', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { featured: { eq: true } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('filter by deeply nested object', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { deep: { object: { eq: true } } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('2')
})

test('filter dates by between', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { between: ["2018-03-28", "2018-07-14"] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter dates by dteq', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { dteq: "2018-03-28" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('2')
})

test('filter dates by gt', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { gt: "2018-03-28" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('4')
  expect(data.allProduct.edges[1].node.id).toEqual('3')
})

test('filter by reference id', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { related: { eq: "2" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('filter by multiple reference ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { alternatives: { containsAny: ["1", "4"] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('handle pagination for filtered nodes', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (perPage: 2, filter: { title: { regex: "Do[l|j]or" } }) {
      totalCount
      pageInfo {
       totalPages
      }
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.totalCount).toEqual(2)
  expect(data.allProduct.pageInfo.totalPages).toEqual(1)
})

test('setup inferred filter input types', async () => {
  const schema = await buildSchema()
  const inputType = schema.getType('ProductFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual([
    'alternatives', 'date', 'deep', 'discount',
    'featured', 'id', 'price', 'related', 'tags', 'title'
  ])

  expect(inputType.fields.id.type).toEqual(schema.getType('IDQueryOperatorInput'))
  expect(inputType.fields.id.extensions.isInferred).toBeUndefined()
  expect(inputType.fields.date.type).toEqual(schema.getType('DateQueryOperatorInput'))
  expect(inputType.fields.date.extensions.isInferred).toBe(true)
  expect(inputType.fields.title.type).toEqual(schema.getType('StringQueryOperatorInput'))
  expect(inputType.fields.title.extensions.isInferred).toBe(true)
  expect(inputType.fields.price.type).toEqual(schema.getType('IntQueryOperatorInput'))
  expect(inputType.fields.price.extensions.isInferred).toBe(true)
  expect(inputType.fields.discount.type).toEqual(schema.getType('FloatQueryOperatorInput'))
  expect(inputType.fields.discount.extensions.isInferred).toBe(true)
  expect(inputType.fields.featured.type).toEqual(schema.getType('BooleanQueryOperatorInput'))
  expect(inputType.fields.featured.extensions.isInferred).toBe(true)
  expect(inputType.fields.tags.type).toEqual(schema.getType('StringListQueryOperatorInput'))
  expect(inputType.fields.tags.extensions.isInferred).toBe(true)
  expect(inputType.fields.alternatives.type).toEqual(schema.getType('ProductInferredListQueryOperatorInput'))
  expect(inputType.fields.alternatives.extensions.isInferred).toBe(true)
  expect(inputType.fields.related.type).toEqual(schema.getType('ProductInferredQueryOperatorInput'))
  expect(inputType.fields.related.extensions.isInferred).toBe(true)
  expect(inputType.fields.other).toBeUndefined()

  expect(inputType.fields.deep.extensions.isInferred).toBe(true)
  const deepType = inputType.fields.deep.type.toConfig()

  expect(Object.keys(deepType.fields).sort()).toEqual(['object', 'related'])

  expect(deepType.fields.object.type).toEqual(schema.getType('BooleanQueryOperatorInput'))
  expect(deepType.fields.object.extensions.isInferred).toBe(true)
  expect(deepType.fields.related.type).toEqual(schema.getType('ProductInferredQueryOperatorInput'))
  expect(deepType.fields.related.extensions.isInferred).toBe(true)
})

test('setup filter input types from SDL', async () => {
  const schema = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          title: String
          related: Product!
        }
      `)
    })
  })

  const inputType = schema.getType('ProductFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'related', 'title'])
  expect(inputType.fields.id.type).toEqual(schema.getType('IDQueryOperatorInput'))
  expect(inputType.fields.id.extensions.isInferred).toBeUndefined()
  expect(inputType.fields.title.type).toEqual(schema.getType('StringQueryOperatorInput'))
  expect(inputType.fields.title.extensions.isInferred).toBeUndefined()
  expect(inputType.fields.related.type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(inputType.fields.related.extensions.isInferred).toBeUndefined()
})

test('setup filter input types with @reference directive', async () => {
  const schema = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          alternatives: [Product] @reference
        }
      `)
    })
  })

  const inputType = schema.getType('ProductFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual(['alternatives', 'id'])
  expect(inputType.fields.alternatives.type).toEqual(schema.getType('ProductListQueryOperatorInput'))
  expect(inputType.fields.alternatives.extensions.isInferred).toBeUndefined()
})

test('setup custom filter input type @reference by', async () => {
  const schema = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          related: Product @reference(by:"test")
        }
      `)
    })
  })

  const inputType = schema.getType('ProductFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'related'])
  expect(inputType.fields.related.type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(inputType.fields.related.extensions.reference).toMatchObject({ by: 'test' })
  expect(inputType.fields.related.extensions.isInferred).toBeUndefined()
})

test('setup custom filter input type with @proxy', async () => {
  const schema = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          testRelated: Product @proxy(from:"related")
        }
      `)
    })
  })

  const inputType = schema.getType('ProductFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'testRelated'])
  expect(inputType.fields.testRelated.type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(inputType.fields.testRelated.extensions.proxy).toMatchObject({ from: 'related' })
  expect(inputType.fields.testRelated.extensions.isInferred).toBeUndefined()
})

test('filter collection by proxied field', async () => {
  const { errors, data } = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          testRelated: Product @proxy(from:"related")
        }
      `)
    })
  }, `{
    allProduct (filter: { testRelated: { eq: "2" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('setup custom filter input types for custom object types', async () => {
  const schema = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type ProductInfo {
          related: Product
        }
        type Product implements Node {
          deep: ProductInfo
        }
      `)
    })
  })

  const inputType = schema.getType('ProductFilterInput').toConfig()
  const deepType = schema.getType('ProductInfoFilterInput').toConfig()

  expect(Object.keys(inputType.fields).sort()).toEqual(['deep', 'id'])
  expect(Object.keys(deepType.fields).sort()).toEqual(['related'])
  expect(inputType.fields.deep.type).toEqual(schema.getType('ProductInfoFilterInput'))
  expect(deepType.fields.related.type).toEqual(schema.getType('ProductQueryOperatorInput'))
})

function createCollections (api) {
  api.loadSource(({ addCollection }) => {
    const products = addCollection('Product')
    const items = addCollection('Item')

    products.addNode({
      id: '1',
      date: '2017-10-08',
      title: 'Cursus Ridiculus Dolor Justo',
      price: 99,
      featured: false,
      tags: ['one', 'two', 'four'],
      alternatives: [
        { typeName: 'Product', id: '2' }
      ]
    })

    products.addNode({
      id: '2',
      date: '2018-03-28',
      title: 'Dojor Inceptos Venenatis Nibh',
      price: 199,
      discount: 0.5,
      featured: false,
      tags: ['two'],
      deep: {
        object: true,
        related: {
          typeName: 'Product',
          id: '2'
        },
        unoin: [
          { typeName: 'Product', id: '1' },
          { typeName: 'Item', id: '5' }
        ]
      },
      alternatives: [
        { typeName: 'Product', id: '1' },
        { typeName: 'Product', id: '3' }
      ],
      other: [
        { typeName: 'Product', id: '1' },
        { typeName: 'Item', id: '5' }
      ]
    })

    products.addNode({
      id: '3',
      date: '2018-07-14',
      title: 'Bibendum Ornare Pharetra',
      price: 149,
      featured: true,
      tags: ['three', 'four'],
      related: {
        typeName: 'Product',
        id: '2'
      },
      alternatives: [
        { typeName: 'Product', id: '4' }
      ]
    })

    products.addNode({
      id: '4',
      date: '2018-12-20',
      title: 'Vestibulum Aenean Bibendum Euismod',
      price: 119,
      featured: false,
      tags: ['one', 'two'],
      alternatives: [
        { typeName: 'Product', id: '2' },
        { typeName: 'Product', id: '3' }
      ]
    })

    items.addNode({ id: '5', title: 'Item 1' })
  })
}

async function createSchemaAndExecute (query) {
  const app = await new App(__dirname, {
    plugins: [createCollections]
  }).init()

  await app.plugins.loadSources()

  return app.schema.buildSchema().runQuery(query)
}

async function buildSchema (fn = () => null, query) {
  const app = await new App(__dirname, {
    plugins: [
      createCollections,
      fn
    ]
  }).init()

  await app.plugins.loadSources()

  if (query) {
    return app.schema.buildSchema().runQuery(query)
  }

  return app.schema.buildSchema().getSchema()
}
