const path = require('path')
const glob = require('globby')
const slash = require('slash')
const crypto = require('crypto')
const moment = require('moment')
const chokidar = require('chokidar')
const didYouMean = require('didyoumean')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { isPlainObject, trim, get } = require('lodash')

const isDev = process.env.NODE_ENV === 'development'
const FROM_CONTENT_TYPE = 'content-type'
const FROM_CONFIG = 'config'

const makeId = (uid, name) => {
  return crypto.createHash('md5').update(uid + name).digest('hex')
}

const makePath = (object, { dateField, routeKeys, createPath }) => {
  const date = moment.utc(object[dateField], ISO_8601_FORMAT, true)
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
      fieldPath = ['title']
    }

    const field = get(object, fieldPath, fieldName)

    if (fieldName === 'id') params.id = object.id
    else if (fieldName === 'year' && !object.year) params.year = date.format('YYYY')
    else if (fieldName === 'month' && !object.month) params.month = date.format('MM')
    else if (fieldName === 'day' && !object.day) params.day = date.format('DD')
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
            : slugify(String(value), { separator: '-' })
        } else {
          return ''
        }
      }).filter(Boolean)

      params[name] = repeated ? segments : segments[0]
    }
  }

  return '/' + trim(createPath(params), '/')
}


const createTemplateOptions = options => {
  let createPath = () => null
  const routeKeys = []

  if (typeof options.path === 'string') {
    options.path = '/' + options.path.replace(/^\/+/g, '')
    createPath = pathToRegexp.compile(options.path)
    pathToRegexp(options.path, routeKeys)
  }

  return {
    createPath,
    name: options.name || 'default',
    path: options.path,
    typeName: options.typeName,
    dateField: options.dateField || 'date',
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

const setupTemplates = config => {
  const templates = {
    byComponent: new Map(),
    byTypeName: new Map()
  }

  for (const typeName in config) {
    config[typeName].forEach(options => {
      const template = createTemplateOptions(options)
      const byTypeName = templates.byTypeName.get(typeName) || []
      const byComponent = templates.byComponent.get(options.component) || []

      templates.byTypeName.set(typeName, byTypeName.concat(template))
      templates.byComponent.set(options.component, byComponent.concat(template))
    })
  }

  return templates
}

const createTemplates = async (actions, { byComponent }) => {
  const allTemplates = new Map()

  const createTemplate = component => {
    if (byComponent.has(component)) {
      for (const template of byComponent.get(component)) {
        const contentType = actions.getContentType(template.typeName)
        const value = allTemplates.get(component) || []
        const instance = new Template(template, contentType, actions)

        allTemplates.set(component, value.concat(instance))
      }
    }
  }

  const removeTemplate = component => {
    if (allTemplates.has(component)) {
      allTemplates.get(component).forEach(instance => instance.remove())
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
    createTemplate(filePath)
  }

  if (isDev) {
    const watcher = chokidar.watch(paths, {
      disableGlobbing: true,
      ignoreInitial: true
    })

    watcher.on('add', file => createTemplate(slash(file)))
    watcher.on('unlink', file => removeTemplate(slash(file)))
  }
}

class TemplatesPlugin {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    const templates = setupTemplates(api.config.templates)

    // TODO: deprecate route and component option on collections
    api.onCreateContentType(options => {
      options.route = typeof options.route === 'string'
        ? '/' + trim(options.route, '/')
        : undefined

      /**
       * Normalize the component path. Relative paths are resolved
       * from the project root. A file at `src/templates/{typeName}.vue`
       * is used as default value if no component path is defined.
       * Setting `component: null` will didsable the template.
       */
      options.component = typeof options.component !== 'undefined'
        ? typeof options.component === 'string'
          ? path.isAbsolute(options.component)
            ? options.component
            : path.join(api.context, options.component)
          : null
        : path.join(api.config.templatesDir, `${options.typeName}.vue`)

      if (!templates.byComponent.has(options.component)) {
        const byTypeName = templates.byTypeName.get(options.typeName) || []
        const byComponent = templates.byComponent.get(options.component) || []

        const template = createTemplateOptions({
          component: options.component,
          typeName: options.typeName,
          dateField: options.dateField,
          path: options.route,
          fieldName: 'path',
          from: FROM_CONTENT_TYPE
        })

        templates.byComponent.set(options.component, byComponent.concat(template))
        templates.byTypeName.set(options.typeName, byTypeName.concat(template))
      }
    })

    api.onCreateNode((options, contentType) => {
      const typeTemplates = templates.byTypeName.get(contentType.typeName)

      if (typeof options.path === 'string') {
        options.path = '/' + trim(options.path, '/')
      }

      if (typeTemplates) {
        for (const template of typeTemplates) {
          const path = options.internal.path = options.internal.path || {}

          switch (typeof template.path) {
            case 'string': path[template.name] = makePath(options, template); break
            case 'function ': path[template.name] = template.path(options); break
            default: path.default = options.path
          }

          // - set default path as root field for plugins that depends on it
          // - it is also used as the $path variable in queries
          if (template.name === 'default' && !options.path) {
            options.path = path[template.name]
          }
        }
      }
    })

    api.createSchema(({ addSchemaResolvers }) => {
      const contentTypes = api._app.store.collections
      const typeNames = Object.keys(contentTypes)

      for (const typeName of templates.byTypeName.keys()) {
        if (!typeNames.includes(typeName)) {
          const suggestion = didYouMean(typeName, typeNames)

          throw new Error(
            `A content type for the ${typeName} template does not exist.` +
            (suggestion ? ` Did you mean ${suggestion}?` : '')
          )
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
                  if (args.to === 'default' && typeof node.path === 'string') {
                    return node.path
                  }

                  return node.internal.path[args.to]
                }
              }
            }
          })
        })
      }
    })

    api.createManagedPages(actions => {
      return createTemplates(actions, templates)
    })
  }
}

class Template {
  constructor (template, contentType, actions) {
    this.template = template
    this.contentType = contentType
    this.actions = actions

    if (typeof template.path === 'string') {
      this.route = actions.createRoute({
        path: template.path,
        component: template.component
      })
    }

    const nodes = contentType.data()
    const length = nodes.length

    for (let i = 0; i < length; i++) {
      this.createPage(nodes[i])
    }

    this.contentType.on('add', this.createPage, this)
    this.contentType.on('update', this.updatePage, this)
    this.contentType.on('remove', this.removePage, this)
  }

  remove () {
    const { component } = this.template

    this.contentType.off('add', this.createPage, this)
    this.contentType.off('update', this.updatePage, this)
    this.contentType.off('remove', this.removePage, this)

    if (this.route) this.actions.removeRoute(this.route.id)
    else this.actions.removePagesByComponent(component)
  }

  createPage (node) {
    const { name, component } = this.template
    const id = makeId(node.$uid, this.template.name)
    const path = node.internal.path[name]
    const queryVariables = node

    if (this.route) this.route.addPage({ id, path, queryVariables })
    else this.actions.createPage({ id, path, component, queryVariables })
  }

  updatePage (node, oldNode) {
    const { path, name } = this.template

    if (
      node.internal.path[name] !== oldNode.internal.path[name] &&
      typeof path !== 'string'
    ) {
      this.actions.removePage(
        makeId(node.$uid, this.template.name)
      )
    }

    this.createPage(node)
  }

  removePage (node) {
    this.actions.removePage(
      makeId(node.$uid, this.template.name)
    )
  }
}

module.exports = TemplatesPlugin
