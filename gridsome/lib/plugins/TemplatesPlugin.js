const path = require('path')
const glob = require('globby')
const leven = require('leven')
const crypto = require('crypto')
const moment = require('moment')
const chokidar = require('chokidar')
const pathToRegexp = require('path-to-regexp')
const { deprecate } = require('../utils/deprecate')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { isPlainObject, trimStart, trimEnd, get, memoize } = require('lodash')

const isDev = process.env.NODE_ENV === 'development'
const FROM_CONTENT_TYPE = 'content-type'
const FROM_CONFIG = 'config'

const makeId = (uid, name) => {
  return crypto.createHash('md5').update(uid + name).digest('hex')
}

const makePath = (object, { path, routeKeys, createPath }, dateField = 'date', slugify) => {
  const date = memoize(() => moment.utc(object[dateField], ISO_8601_FORMAT, true))
  const length = routeKeys.length
  const params = {}

  /**
   * Param values are slugified but the original
   * value will be available with '_raw' suffix.
   */
  for (let i = 0; i < length; i++) {
    const { name, fieldName, repeat, suffix } = routeKeys[i]
    let { path: fieldPath } = routeKeys[i]

    // TODO: remove before 1.0
    // let slug fallback to title
    if (name === 'slug' && !object.slug) {
      deprecate(
        `You have a :slug parameter in your route (${path}) but no slug ` +
        `field exist on the node. The title field will be used instead ` +
        `but you should change to :title in the route or use another field. ` +
        `This fallback will be removed in v0.8.`,
        { stackIndex: 5 }
      )
      fieldPath = ['title']
    }

    const field = get(object, fieldPath, fieldName)

    if (fieldName === 'id') params.id = object.id
    else if (fieldName === 'year' && !object.year) params.year = date().format('YYYY')
    else if (fieldName === 'month' && !object.month) params.month = date().format('MM')
    else if (fieldName === 'day' && !object.day) params.day = date().format('DD')
    else {
      const repeated = repeat && Array.isArray(field)
      const values = repeated ? field : [field]

      const segments = values.map(value => {
        if (
          isPlainObject(value) &&
          value.hasOwnProperty('typeName') &&
          value.hasOwnProperty('id') &&
          !Array.isArray(value.id)
        ) {
          return String(value.id)
        } else if (!isPlainObject(value)) {
          return suffix === 'raw'
            ? String(value)
            : slugify(String(value))
        } else {
          return ''
        }
      }).filter(Boolean)

      params[name] = repeated ? segments : segments[0]
    }
  }

  return createPath(params)
}

const createTemplateOptions = (options, trailingSlash) => {
  let templatePath = options.path
  let createPath = () => null

  const routeKeys = []

  if (typeof templatePath === 'string') {
    templatePath = templatePath.replace(/\/+/g, '/')

    if (trailingSlash) {
      templatePath = trimEnd(templatePath, '/') + '/'
    }

    createPath = pathToRegexp.compile(templatePath)
    pathToRegexp(templatePath, routeKeys)
  }

  return {
    createPath,
    name: options.name || 'default',
    path: templatePath,
    typeName: options.typeName,
    component: options.component,
    from: options.from || FROM_CONFIG,
    routeKeys: routeKeys
      .filter(key => typeof key.name === 'string')
      .map(key => {
        // separate field name from suffix
        const [, fieldName, suffix] = (
          key.name.match(/^(.*[^_])_([a-z]+)$/) ||
          [null, key.name, null]
        )

        const path = fieldName.split('__')

        return {
          name: key.name,
          path,
          fieldName,
          repeat: key.repeat,
          suffix
        }
      })
  }
}

const setupTemplates = ({ templates, permalinks }) => {
  const res = {
    byComponent: new Map(),
    byTypeName: new Map()
  }

  for (const typeName in templates) {
    templates[typeName].forEach(options => {
      const byTypeName = res.byTypeName.get(typeName) || []
      const byComponent = res.byComponent.get(options.component) || []
      const template = createTemplateOptions(options, permalinks.trailingSlash)

      res.byTypeName.set(typeName, byTypeName.concat(template))
      res.byComponent.set(options.component, byComponent.concat(template))
    })
  }

  return res
}

class TemplatesPlugin {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    const templates = setupTemplates(api.config)
    const { permalinks: { trailingSlash }} = api.config

    api._app.store.hooks.addCollection.tap('TemplatesPlugin', options => {
      const templatePath = typeof options.route === 'string'
        ? '/' + trimStart(options.route, '/')
        : undefined

      /**
       * Normalize the component path. Relative paths are resolved
       * from the project root. A file at `src/templates/{typeName}.vue`
       * is used as default value if no component path is defined.
       * Setting `component: null` will didsable the template.
       */
      const templateComponent = typeof options.component !== 'undefined'
        ? typeof options.component === 'string'
          ? path.isAbsolute(options.component)
            ? options.component
            : path.join(api.context, options.component)
          : null
        : path.join(api.config.templatesDir, `${options.typeName}.vue`)

      if (templateComponent && !templates.byComponent.has(templateComponent)) {
        const byTypeName = templates.byTypeName.get(options.typeName) || []
        const byComponent = templates.byComponent.get(templateComponent) || []

        const template = createTemplateOptions({
          component: templateComponent,
          typeName: options.typeName,
          dateField: options.dateField,
          path: templatePath,
          from: FROM_CONTENT_TYPE
        }, api.config.permalinks.trailingSlash)

        templates.byComponent.set(templateComponent, byComponent.concat(template))
        templates.byTypeName.set(options.typeName, byTypeName.concat(template))
      }

      if (templates.byTypeName.has(options.typeName)) {
        options._indices = ['path']
        options._unique = ['path']
      }
    })

    api.onCreateNode((options, collection) => {
      const typeTemplates = templates.byTypeName.get(collection.typeName)
      const { internal } = options

      if (typeTemplates) {
        for (const template of typeTemplates) {
          let nodePath

          if (typeof template.path === 'string') {
            nodePath = makePath(options, template, collection._dateField, api._app.slugify)
          } else if (typeof template.path === 'function') {
            nodePath = template.path(options)

            if (trailingSlash) {
              nodePath = trimEnd(nodePath, '/') + '/'
            }
          } else {
            continue
          }

          internal.publicPath = internal.publicPath || {}
          internal.publicPath[template.name] = nodePath
        }

        // - set default path as root field for plugins that depends on it
        // - many are also using it as the $path variable in queries
        if (internal.publicPath) {
          options.path = internal.publicPath.default
        }
      }
    })

    api.createSchema(({ addSchemaResolvers }) => {
      const collections = api._app.store.collections
      const typeNames = Object.keys(collections)

      for (const typeName of templates.byTypeName.keys()) {
        if (!typeNames.includes(typeName)) {
          const suggestion = typeNames.find(value => {
            return leven(value, typeName) < 3
          })

          throw new Error(
            `A content type for the ${typeName} template does not exist.` +
            (suggestion ? ` Did you mean ${suggestion}?` : '')
          )
        }

        const typeTemplates = templates.byTypeName.get(typeName)
        const collection = collections[typeName]
        const nodes = collection.data()

        // remove automatic templates from collections
        // without a route where no nodes has a path
        for (const [index, tmpl] of typeTemplates.entries()) {
          if (
            tmpl.from === FROM_CONTENT_TYPE &&
            typeof tmpl.path === 'undefined' &&
            nodes.filter(node => node.path).length < 1
          ) {
            templates.byComponent.delete(tmpl.component)
            typeTemplates.splice(index, 1)
          }
        }

        templates.byTypeName.get(typeName).forEach(() => {
          addSchemaResolvers({
            [typeName]: {
              path: {
                type: 'String',
                args: {
                  to: { type: 'String', defaultValue: 'default' }
                },
                resolve: (node, args) => {
                  return node.internal.publicPath
                    ? node.internal.publicPath[args.to]
                    : node.path
                }
              }
            }
          })
        })
      }
    })

    api.createManagedPages(async actions => {
      const { byComponent } = templates
      const allTemplates = new Map()

      const createTemplate = component => {
        if (byComponent.has(component)) {
          for (const template of byComponent.get(component)) {
            const { typeName, name, path, component } = template
            const collection = actions.getCollection(typeName)
            const instance = new Template(typeName, name, path, component, actions)
            const value = allTemplates.get(component) || []

            const nodes = collection.data()
            const length = nodes.length

            for (let i = 0; i < length; i++) {
              instance.createPage(nodes[i])
            }

            collection.on('add', instance.createPage, instance)
            collection.on('update', instance.updatePage, instance)
            collection.on('remove', instance.removePage, instance)

            allTemplates.set(component, value.concat(instance))
          }
        }
      }

      const removeTemplate = component => {
        if (allTemplates.has(component)) {
          allTemplates.get(component).forEach(instance => {
            const collection = actions.getCollection(instance.typeName)

            collection.off('add', instance.createPage, instance)
            collection.off('update', instance.updatePage, instance)
            collection.off('remove', instance.removePage, instance)

            instance.remove()
          })

          allTemplates.delete(component)
        }
      }

      /**
       * Find component files and create pages for components
       * that matches any of the template paths. Watch the paths
       * in development to act on new or deleted files.
       */
      const paths = Array.from(byComponent.keys())
      const files = await glob(paths, { globstar: false, extglob: false })

      for (const filePath of files) {
        createTemplate(path.normalize(filePath))
      }

      if (isDev) {
        const watcher = chokidar.watch(paths, {
          disableGlobbing: true,
          ignoreInitial: true
        })

        watcher.on('add', file => createTemplate(path.normalize(file)))
        watcher.on('unlink', file => removeTemplate(path.normalize(file)))
      }
    })
  }
}

class Template {
  constructor(typeName, name, path, component, actions) {
    this.typeName = typeName
    this.name = name
    this.path = path
    this.component = component
    this.actions = actions

    if (typeof path === 'string') {
      this.route = actions.createRoute({ path, component })
    }
  }

  remove () {
    if (this.route) this.actions.removeRoute(this.route.id)
    else this.actions.removePagesByComponent(this.component)
  }

  createPage (node) {
    const { name, component } = this
    const id = makeId(node.$uid, name)
    const queryVariables = node
    const path = node.internal.publicPath
      ? node.internal.publicPath[name]
      : node.path

    if (this.route) this.route.addPage({ id, path, queryVariables })
    else this.actions.createPage({ id, path, component, queryVariables })
  }

  updatePage (node, oldNode) {
    const { path, name } = this

    if (
      node.internal.publicPath[name] !== oldNode.internal.publicPath[name] &&
      typeof path !== 'string'
    ) {
      this.actions.removePage(
        makeId(node.$uid, this.name)
      )
    }

    this.createPage(node)
  }

  removePage (node) {
    this.actions.removePage(
      makeId(node.$uid, this.name)
    )
  }
}

module.exports = TemplatesPlugin
