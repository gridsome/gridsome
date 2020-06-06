const App = require('../../app/App')
const { BOOTSTRAP_CONFIG, BOOTSTRAP_PAGES } = require('../../utils/constants')

test('add custom GraphQL object types', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, schema }) => {
      addCollection('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value'
      })

      addSchemaTypes([
        schema.createObjectType({
          name: 'Author',
          fields: {
            name: 'String'
          }
        }),
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          extensions: {
            infer: true
          },
          fields: {
            id: 'ID!',
            author: {
              type: 'Author',
              resolve: () => ({ name: 'The Author' })
            }
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      content
      author {
        name
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.content).toEqual('Value')
  expect(data.post.author).toMatchObject({ name: 'The Author' })
})

test('add custom GraphQL union type with Node interface', async () => {
  const app = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Track').addNode({ id: '1', name: 'A Track' })
      store.addCollection('Album').addNode({ id: '1', name: 'An Album' })
      store.addCollection('Single').addNode({ id: '1', name: 'A Single' })
    })

    api.createSchema(({ addSchemaTypes, schema }) => {
      addSchemaTypes([
        schema.createObjectType({
          name: 'Album',
          interfaces: ['Node'],
          fields: {
            name: 'String'
          }
        }),
        schema.createObjectType({
          name: 'Single',
          interfaces: ['Node'],
          fields: {
            name: 'String'
          }
        }),
        schema.createUnionType({
          name: 'AppearsOnUnion',
          interfaces: ['Node'],
          types: ['Album', 'Single']
        }),
        schema.createObjectType({
          name: 'Track',
          interfaces: ['Node'],
          fields: {
            appearsOn: {
              type: ['AppearsOnUnion'],
              resolve: (_, args, ctx) => {
                const query = { typeName: { $in: ['Album', 'Single'] }}
                return ctx.store.chainIndex(query).data()
              }
            }
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    track(id:"1") {
      appearsOn {
        __typename
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.track.appearsOn).toHaveLength(2)
})

test('add custom GraphQL union type', async () => {
  const app = await createApp(api => {
    api.loadSource(actions => {
      actions.addCollection('Post').addNode({
        id: '1',
        test: {
          type: 'TestType2',
          name: 'something'
        }
      })
    })

    api.createSchema(({ addSchemaTypes, schema }) => {
      addSchemaTypes([
        schema.createObjectType({
          name: 'TestType1',
          fields: {
            name: 'String'
          }
        }),
        schema.createObjectType({
          name: 'TestType2',
          fields: {
            name: 'String'
          }
        }),
        schema.createUnionType({
          name: 'TestTypes',
          types: ['TestType1', 'TestType2'],
          resolveType: obj => obj.type
        }),
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            test: 'TestTypes'
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      test {
        __typename
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.test.__typename).toEqual('TestType2')
})

// TODO: require unique id's for all nodes
test('add custom GraphQL union type', async () => {
  const app = await createApp(api => {
    api.loadSource(actions => {
      actions.addCollection('Post').addNode({
        id: '1',
        ref: '3'
      })
      actions.addCollection('Test1').addNode({ $uid: '2' })
      actions.addCollection('Test2').addNode({ $uid: '3' })
    })

    api.createSchema(({ addSchemaTypes, schema }) => {
      addSchemaTypes([
        schema.createUnionType({
          name: 'TestTypes',
          types: ['Test1', 'Test2']
        }),
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            ref: 'TestTypes'
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      ref {
        __typename
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.ref.__typename).toEqual('Test2')
})

test('add custom GraphQL types from SDL', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, store }) => {
      addCollection('Tag').addNode({ id: '1', foo: { slug: 'tag-one' }})
      addCollection('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value1',
        tag: store.createReference('Tag', '1'),
        foo: {
          bar: 'Value2',
          tag: 'tag-one'
        }
      })
    })

    api.createSchema(({ addSchemaTypes, addSchemaResolvers }) => {
      addSchemaTypes(`
        type Author {
          name: String
        }
        type Post implements Node @infer {
          proxyContent: String @proxy(from:"content")
          proxyDeep: String @proxy(from:"foo.bar")
          proxyRef: Tag @reference(by:"foo.slug") @proxy(from:"foo.tag")
          author: Author @proxy
        }
      `)

      addSchemaResolvers({
        Post: {
          author: () => ({
            name: 'The Author'
          })
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      content
      proxyContent
      proxyDeep
      proxyRef {
        id
      }
      author {
        name
      }
      tag {
        id
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.content).toEqual('Value1')
  expect(data.post.proxyContent).toEqual('Value1')
  expect(data.post.proxyDeep).toEqual('Value2')
  expect(data.post.proxyRef).toMatchObject({ id: '1' })
  expect(data.post.tag).toMatchObject({ id: '1' })
  expect(data.post.author).toMatchObject({ name: 'The Author' })

  const composer = app.schema.getComposer()

  expect(composer.getAnyTC('Post').getTypeName()).toEqual('Post')
  expect(composer.getAnyTC('Tag').getExtensions().isInferred).toBeUndefined()
  expect(composer.getAnyTC('Post').getField('foo').type.getTypeName()).toEqual('Post_Foo')
  expect(() => composer.getAnyTC('Author').getField('foo')).toThrow()
})

describe('add reference resolvers', () => {
  test('simple references', async () => {
    const app = await initApp(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Track implements Node {
          album: Album
          albums: [Album]
        }
      `)
    })

    const { errors, data } = await app.graphql(`{
      track(id:"1") {
        album { name }
        albums { name }
      }
    }`)

    const schemaComposer = app.schema.getComposer()
    const typeComposer = schemaComposer.get('Track')
    const fields = typeComposer.getFields()

    expect(errors).toBeUndefined()
    expect(data.track.album.name).toEqual('Second Album')
    expect(data.track.albums).toHaveLength(2)
    expect(data.track.albums[0].name).toEqual('First Album')
    expect(data.track.albums[1].name).toEqual('Second Album')

    expect(Object.keys(fields.albums.args)).toHaveLength(0)
  })

  test('add reference args with @reference', async () => {
    const app = await initApp(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Track implements Node {
          anotherAlbum: Album @reference
          otherAlbums: [Album] @reference
        }
      `)
    })

    const { errors, data } = await app.graphql(`{
      track(id:"1") {
        anotherAlbum { name }
        otherAlbums(limit:1, skip:1) { name }
      }
    }`)

    const schemaComposer = app.schema.getComposer()
    const typeComposer = schemaComposer.get('Track')
    const fields = typeComposer.getFields()

    expect(errors).toBeUndefined()
    expect(data.track.anotherAlbum.name).toEqual('Second Album')
    expect(data.track.otherAlbums).toHaveLength(1)
    expect(data.track.otherAlbums[0].name).toEqual('Third Album')

    expect(Object.keys(fields.anotherAlbum.args)).toHaveLength(0)
    expect(Object.keys(fields.otherAlbums.args)).toHaveLength(5)
  })

  test('reference by custom field with @reference', async () => {
    const app = await initApp(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Track implements Node {
          albumBySlug: Album @reference(by:"slug")
          albumsBySlug: [Album] @reference(by:"slug")
        }
      `)
    })

    const { errors, data } = await app.graphql(`{
      track(id:"1") {
        albumBySlug { name }
        albumsBySlug { name }
      }
    }`)

    const schemaComposer = app.schema.getComposer()
    const typeComposer = schemaComposer.get('Track')
    const fields = typeComposer.getFields()

    expect(errors).toBeUndefined()
    expect(data.track.albumBySlug.name).toEqual('Third Album')
    expect(data.track.albumsBySlug).toHaveLength(2)
    expect(data.track.albumsBySlug[0].name).toEqual('Second Album')
    expect(data.track.albumsBySlug[1].name).toEqual('Third Album')

    expect(Object.keys(fields.albumBySlug.args)).toHaveLength(0)
    expect(Object.keys(fields.albumsBySlug.args)).toHaveLength(5)
  })

  test('add custom reference resolvers', async () => {
    const app = await initApp(({ addSchemaTypes, addSchemaResolvers }) => {
      addSchemaTypes(`
        type Track implements Node {
          overiddenAlbum: Album
          customAlbum(id: ID!): Album
        }
      `)
      addSchemaResolvers({
        Track: {
          overiddenAlbum (source, args, context) {
            return context.store.getCollection('Album').getNode('2')
          },
          customAlbum (source, { id }, context) {
            return context.store.getCollection('Album').getNode(id)
          }
        }
      })
    })

    const { errors, data } = await app.graphql(`{
      track(id:"1") {
        overiddenAlbum { name }
        customAlbum(id:"2") { name }
      }
    }`)

    const schemaComposer = app.schema.getComposer()
    const typeComposer = schemaComposer.get('Track')
    const fields = typeComposer.getFields()

    expect(errors).toBeUndefined()
    expect(data.track.overiddenAlbum.name).toEqual('Second Album')
    expect(data.track.customAlbum.name).toEqual('Second Album')

    // should not inherit args because it has custom args
    expect(Object.keys(fields.customAlbum.args)).toHaveLength(1)
  })

  test('add default union resolvers', async () => {
    const app = await initApp(({ addSchemaTypes }) => {
      addSchemaTypes(`
        union AppearsOn = Album | Single
        type Track implements Node {
          union: AppearsOn
          unions: [AppearsOn]
          unionRef: AppearsOn
          unionRefs: [AppearsOn]
        }
      `)
    })

    const { errors, data } = await app.graphql(`{
      track(id:"1") {
        union {
          ... on Single { name }
        }
        unions {
          ... on Album { name }
          ... on Single { name }
        }
        unionRef {
          ... on Single { name }
        }
        unionRefs {
          ... on Album { name }
          ... on Single { name }
        }
      }
    }`)

    expect(errors).toBeUndefined()
    expect(data.track.union.name).toEqual('Second Single')
    expect(data.track.unions).toHaveLength(2)
    expect(data.track.unions[0].name).toEqual('Second Album')
    expect(data.track.unions[1].name).toEqual('Second Single')
    expect(data.track.unionRef.name).toEqual('Second Single')
    expect(data.track.unionRefs).toHaveLength(2)
    expect(data.track.unionRefs[0].name).toEqual('First Album')
    expect(data.track.unionRefs[1].name).toEqual('Second Single')
  })

  test('throw if referencing missing collection', async () => {
    expect(initApp(({ addSchemaTypes }) => {
      addSchemaTypes(`
        type Track implements Node {
          album: MissingType
        }
        type MissingType implements Node {
          id: ID!
        }
      `)
    })).rejects.toThrow('Track.album')
  })
})

test('add custom resolver for invalid field names', async () => {
  const app = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post').addNode({
        id: '1',
        '123': 4,
        '456-test': 4,
        '789 test': 10,
        'sub-fields': {
          'sub-field': 10
        }
      })
    })

    api.createSchema(({ addSchemaTypes, addSchemaResolvers, schema }) => {
      addSchemaTypes([
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          extensions: {
            infer: true
          },
          fields: {
            id: 'ID!',
            _123: {
              type: 'Int',
              resolve: obj => obj['123'] + 6
            },
            proxyField: {
              type: 'Int',
              extensions: {
                proxy: {
                  from: '789 test'
                }
              }
            }
          }
        })
      ])

      addSchemaResolvers({
        Post: {
          _456_test: {
            resolve: obj => obj['456-test'] + 6
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      _123
      _456_test
      _789_test
      proxyField
      sub_fields {
        sub_field
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post._123).toEqual(10)
  expect(data.post._456_test).toEqual(10)
  expect(data.post._789_test).toEqual(10)
  expect(data.post.proxyField).toEqual(10)
  expect(data.post.sub_fields.sub_field).toEqual(10)
})

test('set field extensions with factory methods', async () => {
  const app = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post').addNode({
        id: '1',
        foo: 10
      })
    })

    api.createSchema(({ addSchemaTypes, schema }) => {
      addSchemaTypes([
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            one: {
              type: 'Int',
              extensions: {
                proxy: {
                  from: 'foo'
                }
              }
            },
            two: {
              type: 'Int',
              extensions: [
                { name: 'proxy', args: { from: 'foo' } }
              ]
            }
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      one
      two
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.one).toEqual(10)
  expect(data.post.two).toEqual(10)
})

test('add custom resolvers for content type', async () => {
  const app = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post').addNode({ id: '1', title: 'My Post' })
    })
    api.createSchema(({ addSchemaResolvers }) => {
      addSchemaResolvers({
        Post: {
          customField: {
            type: 'String',
            resolve () {
              return 'value'
            }
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      customField
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.customField).toEqual('value')
})

test('disable field inference with SDL', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes }) => {
      addCollection('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value'
      })

      addSchemaTypes(`
        type Post implements Node {
          title: String
        }
      `)
    })
  })

  const { errors } = await app.graphql(`{
    post(id:"1") {
      title
      content
    }
  }`)

  expect(errors).toHaveLength(1)
  expect(errors[0].message).toMatch('Cannot query field "content" on type "Post"')
})

test('disable field inference with createObjectType', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, schema }) => {
      addCollection('Post').addNode({
        id: '1',
        title: 'My Post',
        content: 'Value'
      })

      addSchemaTypes([
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            title: 'String'
          }
        })
      ])
    })
  })

  const { errors } = await app.graphql(`{
    post(id:"1") {
      title
      content
    }
  }`)

  expect(errors).toHaveLength(1)
  expect(errors[0].message).toMatch('Cannot query field "content" on type "Post"')
})

test('insert default resolvers for SDL', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, store }) => {
      addCollection('Author').addNode({
        id: '1',
        name: 'An Author'
      })

      addCollection('Post').addNode({
        id: '1',
        title: 'My Post',
        author: '1',
        authors: [
          store.createReference('Author', '1')
        ],
        object: {
          year: '2019'
        }
      })

      addSchemaTypes(`
        type PostObject {
          year: Date
        }
        type Post implements Node {
          title: String
          author: Author
          authors: [Author]
          object: PostObject
        }
      `)
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      object {
        year(format:"DD.MM.YYYY")
      }
      author {
        name
      }
      authors {
        name
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.author.name).toEqual('An Author')
  expect(data.post.authors).toHaveLength(1)
  expect(data.post.authors[0].name).toEqual('An Author')
  expect(data.post.object.year).toEqual('01.01.2019')
})

test('insert default resolvers with createObjectType', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, schema }) => {
      addCollection('Post').addNode({ id: '1', title: 'My Post', author: '1', authors: ['1'] })
      addCollection('Author').addNode({ id: '1', name: 'An Author' })

      addSchemaTypes([
        schema.createObjectType({
          name: 'PostObject',
          fields: {
            year: 'Date'
          }
        }),
        schema.createObjectType({
          name: 'Post',
          interfaces: ['Node'],
          fields: {
            title: 'String',
            author: 'Author',
            authors: ['Author'],
            object: {
              type: 'PostObject',
              resolve: () => ({
                year: '2019'
              })
            }
          }
        })
      ])
    })
  })

  const { errors, data } = await app.graphql(`{
    post(id:"1") {
      title
      object {
        year(format:"DD.MM.YYYY")
      }
      author {
        name
      }
      authors {
        name
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('My Post')
  expect(data.post.author.name).toEqual('An Author')
  expect(data.post.authors).toHaveLength(1)
  expect(data.post.authors[0].name).toEqual('An Author')
  expect(data.post.object.year).toEqual('01.01.2019')
})

test('add custom GraphQL schema', async () => {
  const app = await createApp(api => {
    api.createSchema(({ addSchema, ...actions }) => {
      const queryType = new actions.GraphQLObjectType({
        name: 'CustomRootQuery',
        fields: () => ({
          customRootValue: {
            type: actions.GraphQLString,
            args: {
              append: {
                type: actions.GraphQLString,
                defaultValue: 'foo'
              }
            },
            resolve: (obj, args, ctx, info) => {
              return (obj ? obj[info.fieldName] : 'custom value ') + args.append
            }
          },
          nestedObject: {
            type: new actions.GraphQLObjectType({
              name: 'NestedObject',
              fields: {
                subField: {
                  type: queryType,
                  resolve: () => ({ customRootValue: 'subField ' })
                }
              }
            }),
            resolve: () => ({ subField: true })
          }
        })
      })

      addSchema(new actions.GraphQLSchema({
        query: queryType
      }))
    })
  })

  const { errors, data } = await app.graphql(`{
    value1: customRootValue
    value2: customRootValue(append:"bar")
    nestedObject {
      subField {
        customRootValue
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.value1).toEqual('custom value foo')
  expect(data.value2).toEqual('custom value bar')
  expect(data.nestedObject.subField.customRootValue).toEqual('subField foo')
})

test('add custom GraphQL schema with mutations', async () => {
  const app = await createApp(api => {
    api.createSchema(({ addSchema, ...actions }) => {
      addSchema(new actions.GraphQLSchema({
        mutation: new actions.GraphQLObjectType({
          name: 'MyMutations',
          fields: () => ({
            doSomething: {
              type: actions.GraphQLString,
              args: {
                input: {
                  type: actions.GraphQLString,
                  defaultValue: 'foo'
                }
              },
              resolve: (obj, args) => {
                return args.input
              }
            }
          })
        })
      }))
      addSchema(new actions.GraphQLSchema({
        mutation: new actions.GraphQLObjectType({
          name: 'OtherMutations',
          fields: () => ({
            doSomethingElse: {
              type: actions.GraphQLString,
              args: {
                input: {
                  type: actions.GraphQLString,
                  defaultValue: 'bar'
                }
              },
              resolve: (obj, args) => {
                return args.input
              }
            }
          })
        })
      }))
    })
  })

  const { errors, data } = await app.graphql(`mutation {
    doSomething(input:"one")
    doSomethingElse(input:"two")
  }`)

  expect(errors).toBeUndefined()
  expect(data.doSomething).toEqual('one')
  expect(data.doSomethingElse).toEqual('two')
})

test('add custom Metadata schema', async () => {
  const app = await createApp(api => {
    api.createSchema(({ addMetadata, addSchemaTypes }) => {
      addMetadata('myCustomData', true)
      addMetadata('some_value', 10)
      addSchemaTypes(`
        type Metadata {
          myCustomData: String
          someValue: Int @proxy(from:"some_value")
        }
      `)
    })
  })

  const { errors, data } = await app.graphql(`
    query {
      metadata {
        myCustomData
        someValue
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.metadata.myCustomData).toEqual('true')
  expect(data.metadata.someValue).toEqual(10)
})

test('merge object types', async () => {
  const { createObjectType } = require('../utils')
  const app = await createApp(null, BOOTSTRAP_CONFIG)

  app.schema.buildSchema({
    types: [
      'type Post { title: String }',
      'type Post { content: String meta: PostMeta }',
      'type PostMeta @foo { status: Boolean @proxy(from:"foo") }',
      'type PostMeta @bar { status: Boolean @proxy(from:"bar") }',
      'type PostMeta { id: Boolean }',
      createObjectType({
        name: 'Post',
        fields: {
          authorId: 'String'
        }
      })
    ]
  })

  const schemaComposer = app.schema.getComposer()
  const postMetaComposer = schemaComposer.get('PostMeta')
  const typeDefs = app.schema.getSchema().getTypeMap()
  const fields = typeDefs.Post.getFields()
  const metaFields = fields.meta.type.getFields()

  expect(fields.title).toBeDefined()
  expect(fields.content).toBeDefined()
  expect(fields.meta).toBeDefined()
  expect(fields.authorId).toBeDefined()
  expect(metaFields.id).toBeDefined()
  expect(metaFields.status).toBeDefined()
  expect(metaFields.status.extensions.directives).toHaveLength(1)
  expect(metaFields.status.extensions.directives[0]).toMatchObject({ name: 'proxy', args: { from: 'bar' } })
  expect(postMetaComposer.getExtensions().foo).toBeDefined()
  expect(postMetaComposer.getExtensions().bar).toBeDefined()
})

describe('create input types', () => {
  test('create input types with SDL', async () => {
    const app = await createApp(api => {
      api.loadSource(({ addSchemaTypes, addSchemaResolvers }) => {
        addSchemaTypes(`input SomeInput { value: String! }`)
        addSchemaResolvers({
          Query: {
            myResolver: {
              type: 'String',
              args: { string: 'SomeInput' },
              resolve: (_, args) => args.string.value
            }
          }
        })
      })
    })

    const { errors, data } = await app.graphql(`
      query {
        myResolver(string: { value: "foo" })
      }
    `)

    expect(errors).toBeUndefined()
    expect(data.myResolver).toEqual('foo')
  })

  test('create input types with JS', async () => {
    const app = await createApp(api => {
      api.loadSource(({ addSchemaTypes, addSchemaResolvers, schema }) => {
        addSchemaTypes([
          schema.createInputType({
            name: 'SomeInput',
            fields: { value: 'String!' }
          })
        ])
        addSchemaResolvers({
          Query: {
            myResolver: {
              type: 'String',
              args: { string: 'SomeInput' },
              resolve: (_, args) => args.string.value
            }
          }
        })
      })
    })

    const { errors, data } = await app.graphql(`
      query {
        myResolver(string: { value: "foo" })
      }
    `)

    expect(errors).toBeUndefined()
    expect(data.myResolver).toEqual('foo')
  })
})

test('add a experimental field extension', async () => {
  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, addSchemaFieldExtension }) => {
      addCollection('Post').addNode({ id: '1', title: 'test' })
      addSchemaTypes(`
        type Post implements Node {
          title: String @myExtension(value:"-test")
        }
      `)
      addSchemaFieldExtension({
        name: 'myExtension',
        args: { value: 'String' },
        apply (ext) {
          return {
            resolve: (source, args, context, info) => {
              return source[info.fieldName] + ext.value
            }
          }
        }
      })
    })
  })

  const { errors, data } = await app.graphql(`
    query {
      post(id:"1") {
        title
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('test-test')
})

test('apply extensions once per field', async () => {
  const resolve = jest.fn((src, args, ctx, info) => src[info.fieldName])
  const apply = jest.fn(() => ({ resolve }))

  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, addSchemaFieldExtension }) => {
      addCollection('Post').addNode({ id: '1', title: 'test' })
      addSchemaTypes(`
        type Post implements Node {
          title: String @ext
          title2: String @ext @proxy(from: "title")
        }
      `)
      addSchemaFieldExtension({ name: 'ext', apply })
    })
  })

  const { errors, data } = await app.graphql(`
    query {
      post(id:"1") {
        title
        title2
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('test')
  expect(data.post.title2).toEqual('test')
  expect(apply.mock.calls).toHaveLength(2)
  expect(resolve.mock.calls).toHaveLength(2)
})

test('use extension multiple times on field', async () => {
  const apply = jest.fn((ext, config) => ({
    resolve(src, args, ctx, info) {
      return config.resolve(src, args, ctx, info) + ext.value
    }
  }))

  const app = await createApp(api => {
    api.loadSource(({ addCollection, addSchemaTypes, addSchemaFieldExtension }) => {
      addCollection('Post').addNode({ id: '1', title: 'test' })
      addSchemaTypes(`
        type Post implements Node @infer {
          title: String @ext(value:"-one") @ext(value:"-two") @ext
        }
      `)
      addSchemaFieldExtension({
        name: 'ext',
        args: {
          value: {
            type: 'String',
            defaultValue: '-three'
          }
        },
        apply
      })
    })
  })

  const { errors, data } = await app.graphql(`
    query {
      post(id:"1") {
        title
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.post.title).toEqual('test-one-two-three')
  expect(apply.mock.calls).toHaveLength(3)
})

test('prevent overriding built-in GraphQL directives', done => {
  createApp(api => {
    api.loadSource(({ addSchemaFieldExtension }) => {
      expect(() => addSchemaFieldExtension({ name: 'skip' })).toThrow('@skip')
      done()
    })
  })
})

test('prevent overriding @paginate directives', done => {
  createApp(api => {
    api.loadSource(({ addSchemaFieldExtension }) => {
      expect(() => addSchemaFieldExtension({ name: 'paginate' })).toThrow('@paginate')
      done()
    })
  })
})

test('prevent overriding built-in extensions', done => {
  createApp(api => {
    api.loadSource(({ addSchemaFieldExtension }) => {
      expect(() => addSchemaFieldExtension({ name: 'reference' })).toThrow('@reference')
      done()
    })
  })
})

test('output field value as JSON', async () => {
  const app = await initApp(({ addSchemaTypes }) => {
    addSchemaTypes(`
      type Track implements Node @infer {
        albumsBySlug: JSON
      }
    `)
  })

  const { errors, data } = await app.graphql(`{
    track(id:"1") {
      albumsBySlug
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.track.albumsBySlug).toEqual(
    expect.arrayContaining(['second-album', 'third-album'])
  )
})

test('add custom scalar types with createScalarType()', async () => {
  const app = await initApp(({ addSchemaTypes, addSchemaResolvers, schema }) => {
    addSchemaTypes([
      schema.createScalarType({
        name: 'MyScalar',
        serialize: value => ({ ...value, foo: 'bar' })
      })
    ])
    addSchemaResolvers({
      Album: {
        myField: {
          type: 'MyScalar',
          resolve: () => ({ test: true })
        }
      }
    })
  })

  const { errors, data } = await app.graphql(`{
    album(id:"1") {
      myField
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.album.myField).toMatchObject({ test: true, foo: 'bar' })
})

// TODO: remove this before 1.0
test('add deprecated collection field', async () => {
  const app = await createApp(api => {
    api.loadSource(store => store.addCollection('test_post'))
  })

  const queryType = app.schema.getSchema().getQueryType()
  const queryFields = queryType.getFields()

  expect(queryFields).toHaveProperty('testPost')
  expect(queryFields).toHaveProperty('allTestPost')
  expect(queryFields).toHaveProperty('alltest_post')
  expect(queryFields.alltest_post.isDeprecated).toEqual(true)
})

function createApp (plugin, phase = BOOTSTRAP_PAGES) {
  const app = new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(phase)
}

function initApp (fn) {
  return createApp(api => {
    api.loadSource(actions => {
      const tracks = actions.addCollection('Track')
      const albums = actions.addCollection('Album')
      const singles = actions.addCollection('Single')

      albums.addNode({ $uid: '1', id: '1', name: 'First Album', slug: 'first-album' })
      albums.addNode({ $uid: '2', id: '2', name: 'Second Album', slug: 'second-album' })
      albums.addNode({ $uid: '3', id: '3', name: 'Third Album', slug: 'third-album' })
      singles.addNode({ $uid: '4', id: '1', name: 'First Single', slug: 'first-single' })
      singles.addNode({ $uid: '5', id: '2', name: 'Second Single', slug: 'second-single' })
      singles.addNode({ $uid: '6', id: '3', name: 'Third Single', slug: 'third-single' })

      tracks.addNode({
        id: '1',
        album: '2',
        albums: ['1', '2'],
        albumBySlug: 'third-album',
        albumsBySlug: ['second-album', 'third-album'],
        anotherAlbum: '2',
        otherAlbums: ['2', '3'],
        overiddenAlbum: '2',
        union: '5',
        unionRef: actions.createReference('Single', '2'),
        unions: ['2', '5'],
        unionRefs: [
          actions.createReference('Album', '1'),
          actions.createReference('Single', '2')
        ]
      })

      fn(actions)
    })
  })
}
