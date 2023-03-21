const crypto = require('crypto')
const { pick } = require('lodash')
const { specifiedDirectives } = require('graphql')
const PluginStore = require('../store/PluginStore')
const { deprecate } = require('../utils/deprecate')

function createBaseActions (api, app) {
  return {
    graphql (docOrQuery, variables = {}, operationName) {
      return app.schema.runQuery(docOrQuery, variables, operationName)
    },
    resolve (...args) {
      return app.resolve(...args)
    },
    slugify (...args) {
      return app.slugify(...args)
    }
  }
}

function createStoreActions (api, app) {
  const baseActions = createBaseActions(api, app)
  const store = new PluginStore(app, api._entry.options, {
    transformers: api._transformers
  })

  const addCollection = options => {
    if (typeof options === 'string') {
      options = { typeName: options }
    }

    if (typeof options.resolveAbsolutePaths === 'undefined') {
      options.resolveAbsolutePaths = store._resolveAbsolutePaths
    }

    if (options.route && !app.config.templates[options.typeName]) {
      deprecate(
        `The route option in addCollection() ` +
        `is deprecated. Use templates instead.`,
        {
          url: 'https://gridsome.org/docs/templates/'
        }
      )
    }

    return app.store.addCollection(options, store)
  }

  const getCollection = typeName => {
    return store.getCollection(typeName)
  }

  return {
    ...baseActions,
    addCollection,
    getCollection,

    getNodeByUid (uid) {
      return app.store.getNodeByUid(uid)
    },

    getNode (typeName, id) {
      return app.store.getNode(typeName, id)
    },

    addMetadata (key, data) {
      return app.store.addMetadata(key, data)
    },

    store: {
      createUniqueId (id) {
        const { name, index } = api._entry
        return crypto.createHash('md5').update(name + index + id).digest('hex')
      },
      createReference (typeName, id) {
        return store.createReference(typeName, id)
      }
    },

    // deprecated actions

    addContentType (options) {
      deprecate('The addContentType() action has been renamed to addCollection().')
      return addCollection(options)
    },

    getContentType (typeName) {
      deprecate('The getContentType() action has been renamed to getCollection().')
      return getCollection(typeName)
    },

    addMetaData (key, data) {
      deprecate(`The addMetaData() action is deprecated. Use addMetadata() instead.`)
      return store.addMetadata(key, data)
    },
    createTypeName (typeName) {
      deprecate(`The createTypeName() action is deprecated. Type names should be generated manually instead.`)
      return store.createTypeName(typeName)
    },
    createReference (typeName, id) {
      return store.createReference(typeName, id)
    },
    makeUid (orgId) {
      return crypto.createHash('md5').update(orgId).digest('hex')
    },
    makeTypeName (string = '') {
      deprecate(`The makeTypeName() action is deprecated. Type names should be generated manually instead.`)
      return store.createTypeName(string)
    }
  }
}

const {
  createEnumType,
  createObjectType,
  createUnionType,
  createScalarType,
  createInterfaceType,
  createInputType
} = require('../graphql/utils')

function createSchemaActions (api, app) {
  const baseActions = createStoreActions(api, app)
  const { GraphQLJSON } = require('graphql-compose')
  const graphql = require('graphql')

  // TODO: these should just be imported from gridsome/graphql instead
  const graphqlTypes = pick(graphql, [
    // Definitions
    'GraphQLSchema',
    'GraphQLScalarType',
    'GraphQLObjectType',
    'GraphQLInterfaceType',
    'GraphQLUnionType',
    'GraphQLEnumType',
    'GraphQLInputObjectType',
    // Type Wrappers
    'GraphQLList',
    'GraphQLNonNull',
    // Built-in Directives defined by the Spec
    'GraphQLDeprecatedDirective',
    // Standard Scalars
    'GraphQLInt',
    'GraphQLFloat',
    'GraphQLString',
    'GraphQLBoolean',
    'GraphQLID'
  ])

  const directiveNames = specifiedDirectives.map(directive => directive.name)

  return {
    ...baseActions,
    ...graphqlTypes,

    GraphQLJSON,

    addSchema (schema) {
      app.schema._schemas.push(schema)
    },

    addSchemaTypes (typesOrSDL) {
      if (Array.isArray(typesOrSDL)) {
        app.schema._types.push(...typesOrSDL)
      } else {
        app.schema._types.push(typesOrSDL)
      }
    },

    addSchemaResolvers (resolvers) {
      app.schema._resolvers.push(resolvers)
    },

    addSchemaFieldExtension (options) {
      if (directiveNames.includes(options.name)) {
        throw new Error(`Cannot override GraphQL directive: @${options.name}`)
      }
      if (['paginate', 'proxy', 'reference'].includes(options.name)) {
        throw new Error(`Cannot override built-in directive: @${options.name}`)
      }
      if (app.schema._extensions[options.name]) {
        throw new Error(`Field extension already exist: @${options.name}`)
      }

      app.schema._extensions[options.name] = options
    },

    schema: {
      createEnumType,
      createObjectType,
      createUnionType,
      createScalarType,
      createInterfaceType,
      createInputType
    }
  }
}

function createPagesActions (api, app, { digest }) {
  const baseActions = createBaseActions(api, app)
  const internals = { digest, isManaged: false }

  return {
    ...baseActions,

    getCollection (typeName) {
      return app.store.getCollection(typeName)
    },

    getContentType (typeName) {
      deprecate('The getContentType() action has been renamed to getCollection().')
      return app.store.getCollection(typeName)
    },

    createPage (options) {
      if (typeof options.route === 'string') {
        deprecate(`The route option for createPage() is deprecated. Use the createRoute() method instead.`, {
          url: 'https://gridsome.org/docs/pages-api/'
        })
        return createDeprecatedRoute(app.pages, options, internals)
      }

      if (options.name) {
        deprecate(`The name option for createPage() is moved to route.name.`)
        options.route = options.route || {}
        options.route.name = options.name
        delete options.name
      }

      return app.pages.createPage(options, internals)
    },

    createRoute (options) {
      return app.pages.createRoute(options, internals)
    }
  }
}

function createManagedPagesActions (api, app, { digest }) {
  const baseActions = createPagesActions(api, app, { digest })
  const internals = { digest, isManaged: true }

  return {
    ...baseActions,

    createPage (options) {
      if (typeof options.route === 'string') {
        deprecate(`The route option in createPage() is deprecated. Use the createRoute() action instead.`, {
          url: 'https://gridsome.org/docs/pages-api/'
        })
        return createDeprecatedRoute(app.pages, options, internals)
      }

      if (options.name) {
        options.route = options.route || {}
        options.route.name = options.name
        delete options.name
      }

      return app.pages.createPage(options, internals)
    },
    updatePage (options) {
      if (typeof options.route === 'string') {
        deprecate(`The route option in createPage() is deprecated. Use the createRoute() action instead.`, {
          url: 'https://gridsome.org/docs/pages-api/'
        })
        return createDeprecatedRoute(app.pages, options, internals)
      }

      if (options.name) {
        deprecate(`The name option in createPage() has moved to route.name.`)
        options.route = options.route || {}
        options.route.name = options.name
        delete options.name
      }

      return app.pages.updatePage(options, internals)
    },
    removePage (page) {
      return app.pages.removePage(page)
    },
    removePageByPath (path) {
      return app.pages.removePageByPath(path)
    },
    removePagesByComponent (component) {
      return app.pages.removePagesByComponent(component)
    },
    findAndRemovePages (query) {
      return app.pages.findAndRemovePages(query)
    },
    findPage (query) {
      return app.pages.findPage(query)
    },
    findPages (query) {
      return app.pages.findPages(query)
    },
    createRoute (options) {
      return app.pages.createRoute(options, internals)
    },
    removeRoute (id) {
      app.pages.removeRoute(id)
    }
  }
}

// TODO: remove this route workaround
function createDeprecatedRoute (pages, input, internals) {
  const options = pages._routes.by('path', input.route)
  let route = options ? pages.getRoute(options.id) : null

  if (!route) {
    route = pages.createRoute({
      path: input.route,
      component: input.component
    }, internals)
  }

  route.addPage({
    id: input.id,
    path: input.path,
    context: input.context,
    queryVariables: input.queryVariables
  })
}

module.exports = {
  createBaseActions,
  createStoreActions,
  createSchemaActions,
  createPagesActions,
  createManagedPagesActions
}
