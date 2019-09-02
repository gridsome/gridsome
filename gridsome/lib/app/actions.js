const crypto = require('crypto')
const { pick } = require('lodash')

function createBaseActions (api, app) {
  return {
    graphql (docOrQuery, variables = {}) {
      return app.schema.runQuery(docOrQuery, variables)
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

  return {
    ...baseActions,

    addMetadata (key, data) {
      return api.store.addMetadata(key, data)
    },
    addContentType (options) {
      return api.store.addContentType(options)
    },
    getContentType (typeName) {
      return api.store.getContentType(typeName)
    },
    slugify (string) {
      return api.store.slugify(string)
    },

    store: {
      createReference (typeName, id) {
        return api.store.createReference(typeName, id)
      }
    },

    // deprecated actions
    // TODO: warn when used

    addMetaData (key, data) {
      return api.store.addMetadata(key, data)
    },
    createTypeName (typeName) {
      return api.store.createTypeName(typeName)
    },
    createReference (typeName, id) {
      return api.store.createReference(typeName, id)
    },
    makeUid (orgId) {
      return crypto.createHash('md5').update(orgId).digest('hex')
    },
    makeTypeName (string = '') {
      return api.store.createTypeName(string)
    }
  }
}

const {
  createObjectType,
  createUnionType,
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
      if (app.schema._extensions[options.name]) {
        throw new Error(`Field extension already exist: ${options.name}`)
      }

      app.schema._extensions[options.name] = options
    },

    schema: {
      createObjectType,
      createUnionType,
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

    getContentType (typeName) {
      return api.store.getContentType(typeName)
    },

    createPage (options) {
      if (typeof options.route === 'string') {
        return createDeprecatedRoute(app.pages, options, internals)
      }

      if (options.name) {
        options.route = options.route || {}
        options.route.name = options.name
        delete options.name
      }

      return app.pages.createPage(options, internals)
    },

    createRoute(options) {
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
        return createDeprecatedRoute(app.pages, options, internals)
      }

      if (options.name) {
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
