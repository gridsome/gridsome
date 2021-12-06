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

test('filter by exists: true', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { optional: { exists: true } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('4')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter by exists: false', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { optional: { exists: false } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('1')
})

describe('deprecated: filter by reference id', () => {
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

  test('filter by reference created by addReference()', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { item: { eq: "6" } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('1')
  })

  test('filter by reference created by addReference()', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { items: { contains: ["5"] } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('1')
  })
})

test('filter by reference created by addReference()', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { item: { id: { eq: "6" } } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('1')
})

test('filter by reference created by addReference()', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { items: { id: { in: ["5"] } } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('1')
})

test('filter by multiple reference ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { alternatives: { id: { in: ["1", "4"] } } }) {
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

test('deprecated: filter by multiple reference ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { alternatives: { containsAny: ["1", "4"] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(3)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
  expect(data.allProduct.edges[2].node.id).toEqual('1')
})

describe('filter by reference id', () => {
  test('eq', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { related: { id: { eq: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('3')
  })

  test('ne', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { related: { id: { ne: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('2')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })

  test('in', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { related: { id: { in: ["2"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('3')
  })

  test('nin', async () => {
    const { errors, data } = await createSchemaAndExecute(`{
      allProduct (filter: { related: { id: { nin: ["2"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('2')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })
})

describe('filter by user defined reference fields (single)', () => {
  const runQuery = query => buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
      type Product implements Node {
        related: Product
        relatedId: Product
      }
    `)
    })
  }, query)

  test('eq', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { relatedId: { id: { eq: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('3')
  })

  test('eq (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { related: { id: { eq: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('3')
  })

  test('ne', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { relatedId: { id: { ne: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('2')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })

  test('ne (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { related: { id: { ne: "2" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('2')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })

  test('in', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { relatedId: { id: { in: ["2", "4"] } } }) {
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

  test('in (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { related: { id: { in: ["2", "4"] } } }) {
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

  test('nin', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { relatedId: { id: { nin: ["2", "4"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(2)
    expect(data.allProduct.edges[0].node.id).toEqual('2')
    expect(data.allProduct.edges[1].node.id).toEqual('1')
  })

  test('nin (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { related: { id: { nin: ["2", "4"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(2)
    expect(data.allProduct.edges[0].node.id).toEqual('2')
    expect(data.allProduct.edges[1].node.id).toEqual('1')
  })
})

describe('filter by user defined reference fields (list)', () => {
  const runQuery = query => buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
      type Product implements Node {
        alternatives: [Product]
        alternativeIds: [Product]
      }
    `)
    })
  }, query)

  test('in', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternativeIds: { id: { in: ["1", "4"] } } }) {
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

  test('in (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternatives: { id: { in: ["1", "4"] } } }) {
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

  test('nin', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternativeIds: { id: { nin: ["1", "4"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(2)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('1')
  })

  test('nin (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternatives: { id: { nin: ["1", "4"] } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(2)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('1')
  })

  test('eq', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternativeIds: { id: { eq: "1" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('2')
  })

  test('eq (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternatives: { id: { eq: "1" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(1)
    expect(data.allProduct.edges[0].node.id).toEqual('2')
  })

  test('ne', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternativeIds: { id: { ne: "1" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('3')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })

  test('ne (inferred)', async () => {
    const { errors, data } = await runQuery(`{
      allProduct (filter: { alternatives: { id: { ne: "1" } } }) {
        edges {
          node { id }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.allProduct.edges).toHaveLength(3)
    expect(data.allProduct.edges[0].node.id).toEqual('4')
    expect(data.allProduct.edges[1].node.id).toEqual('3')
    expect(data.allProduct.edges[2].node.id).toEqual('1')
  })
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
    'alternativeIds', 'alternatives', 'date', 'deep', 'discount',
    'featured', 'id', 'item', 'items', 'optional', 'price', 'related', 'relatedId',
    'tags', 'title'
  ])

  expect(inputType.fields.id.type).toEqual(schema.getType('IDQueryOperatorInput'))
  expect(inputType.fields.id.extensions.isInferred).toBeUndefined()
  expect(inputType.fields.optional.type).toEqual(schema.getType('StringQueryOperatorInput'))
  expect(inputType.fields.optional.extensions.isInferred).toBe(true)
  expect(inputType.fields.item.type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(inputType.fields.item.extensions.isInferred).toBeUndefined()
  expect(inputType.fields.items.type).toEqual(schema.getType('ProductListQueryOperatorInput'))
  expect(inputType.fields.items.extensions.isInferred).toBeUndefined()
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
  expect(inputType.fields.alternativeIds.type).toEqual(schema.getType('StringListQueryOperatorInput'))
  expect(inputType.fields.alternativeIds.extensions.isInferred).toBe(true)
  expect(inputType.fields.related.type).toEqual(schema.getType('ProductInferredQueryOperatorInput'))
  expect(inputType.fields.related.extensions.isInferred).toBe(true)
  expect(inputType.fields.relatedId.type).toEqual(schema.getType('StringQueryOperatorInput'))
  expect(inputType.fields.relatedId.extensions.isInferred).toBe(true)
  expect(inputType.fields.other).toBeUndefined()

  expect(inputType.fields.deep.extensions.isInferred).toBe(true)
  const deepType = inputType.fields.deep.type.toConfig()

  expect(Object.keys(deepType.fields).sort()).toEqual(['object', 'related'])

  expect(deepType.fields.object.type).toEqual(schema.getType('BooleanQueryOperatorInput'))
  expect(deepType.fields.object.extensions.isInferred).toBe(true)
  expect(deepType.fields.related.type).toEqual(schema.getType('ProductInferredQueryOperatorInput'))
  expect(deepType.fields.related.extensions.isInferred).toBe(true)
})

// #718
test('ensure inferred fields are added to filters', async () => {
  const { errors, data } = await buildSchema(api => {
    api.loadSource(({ addCollection, store }) => {
      addCollection({ typeName: 'Post' }).addNode({
        title: 'The post',
        author1: store.createReference('Author', '1')
      })

      addCollection({ typeName: 'Author' }).addNode({
        id: '1',
        title: 'The author'
      })
    })
  }, `{
    allAuthor(filter: { title: { eq: "The author" } }) {
      edges {
        node {
          id
          title
        }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allAuthor.edges).toHaveLength(1)
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

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'item', 'items', 'related', 'title'])
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

  expect(Object.keys(inputType.fields).sort()).toEqual(['alternatives', 'id', 'item', 'items'])
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
  const { related: { type, extensions } } = inputType.fields

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'item', 'items', 'related'])
  expect(type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(extensions.isInferred).toBeUndefined()
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
  const { testRelated: { type, extensions } } = inputType.fields

  expect(Object.keys(inputType.fields).sort()).toEqual(['id', 'item', 'items', 'testRelated'])
  expect(type).toEqual(schema.getType('ProductQueryOperatorInput'))
  expect(extensions.isInferred).toBeUndefined()
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

test('proxied input types should use last instance', async () => {
  const { errors, data } = await buildSchema(api => {
    api.loadSource(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Product implements Node {
          testRelated: Product @proxy(from:"fail") @proxy(from:"related")
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

  expect(Object.keys(inputType.fields).sort()).toEqual(['deep', 'id', 'item', 'items'])
  expect(Object.keys(deepType.fields).sort()).toEqual(['related'])
  expect(inputType.fields.deep.type).toEqual(schema.getType('ProductInfoFilterInput'))
  expect(deepType.fields.related.type).toEqual(schema.getType('ProductQueryOperatorInput'))
})

function createCollections (api) {
  api.loadSource(({ addCollection }) => {
    const products = addCollection('Product')
    const items = addCollection('Item')

    products.addReference('items', '[Product]')
    products.addReference('item', 'Product')

    products.addNode({
      id: '1',
      date: '2017-10-08',
      title: 'Cursus Ridiculus Dolor Justo',
      price: 99,
      items: ['5', '7'],
      item: '6',
      featured: false,
      tags: ['one', 'two', 'four'],
      alternatives: [
        { typeName: 'Product', id: '2' },
        { typeName: 'Product', id: '11' }
      ],
      alternativeIds: ['2', '11']
    })

    products.addNode({
      id: '2',
      date: '2018-03-28',
      title: 'Dojor Inceptos Venenatis Nibh',
      optional: 'test',
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
        union: [
          { typeName: 'Product', id: '1' },
          { typeName: 'Item', id: '5' }
        ]
      },
      alternatives: [
        { typeName: 'Product', id: '1' },
        { typeName: 'Product', id: '3' }
      ],
      alternativeIds: ['1', '3'],
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
      related: { typeName: 'Product', id: '2' },
      relatedId: '2',
      alternatives: [
        { typeName: 'Product', id: '4' }
      ],
      alternativeIds: ['4']
    })

    products.addNode({
      id: '4',
      date: '2018-12-20',
      title: 'Vestibulum Aenean Bibendum Euismod',
      optional: null,
      price: 119,
      featured: false,
      tags: ['one', 'two'],
      related: { typeName: 'Product', id: '4' },
      relatedId: '4',
      alternatives: [
        { typeName: 'Product', id: '2' },
        { typeName: 'Product', id: '3' }
      ],
      alternativeIds: ['2', '3']
    })

    items.addNode({ id: '5', title: 'Item 1' })
    items.addNode({ id: '6', title: 'Item 2' })
    items.addNode({ id: '7', title: 'Item 3' })
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
