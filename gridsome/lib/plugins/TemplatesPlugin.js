const path = require('path')
const glob = require('globby')
const slash = require('slash')
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

class TemplatesPlugin {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    const templates = this.setupTemplates(api.config.templates)

    // TODO: deprecate route and component option
    api.onCreateContentType(options => {
      options.route = typeof options.route === 'string'
        ? '/' + options.route.replace(/^\/+/g, '')
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
        const value = templates.byTypeName.get(options.typeName) || []
        const template = this.createTemplateOptions({
          component: options.component,
          typeName: options.typeName,
          dateField: options.dateField,
          path: options.route,
          fieldName: 'path',
          from: FROM_CONTENT_TYPE
        })

        templates.byComponent.set(options.component, template)
        templates.byTypeName.set(options.typeName, value.concat(template))
      }
    })

    api.onCreateNode((options, contentType) => {
      const typeTemplates = templates.byTypeName.get(contentType.typeName)

      if (typeTemplates) {
        // TODO: add path fields with schema API instead
        for (const template of typeTemplates) {
          const fieldValue = options[template.fieldName]

          if (fieldValue) {
            options[template.fieldName] = '/' + trim(fieldValue, '/')
          } else if (template.path) {
            options[template.fieldName] = makePath(options, template)
          }
        }
      }
    })

    api.createManagedPages(actions => {
      const contentTypes = actions.getContentTypes()
      const typeNames = Object.keys(contentTypes)

      // check if content types for defined templates exist
      for (const typeName of templates.byTypeName.keys()) {
        if (!typeNames.includes(typeName)) {
          const suggestion = didYouMean(typeName, typeNames)

          throw new Error(
            `A content type for the ${typeName} template does not exist.` +
            (suggestion ? ` Did you mean ${suggestion}?` : '')
          )
        }
      }

      return this.createTemplates(actions, templates)
    })
  }

  setupTemplates (config) {
    const templates = {
      byComponent: new Map(),
      byTypeName: new Map()
    }

    for (const typeName in config) {
      config[typeName].forEach(options => {
        const template = this.createTemplateOptions(options)
        const value = templates.byTypeName.get(typeName) || []

        templates.byComponent.set(options.component, template)
        templates.byTypeName.set(typeName, value.concat(template))
      })
    }

    return templates
  }

  createTemplateOptions (options) {
    let createPath = () => null
    const routeKeys = []

    if (typeof options.path === 'string') {
      options.path = '/' + options.path.replace(/^\/+/g, '')
      createPath = pathToRegexp.compile(options.path)
      pathToRegexp(options.path, routeKeys)
    }

    return {
      createPath,
      path: options.path,
      typeName: options.typeName,
      fieldName: options.fieldName,
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

  async createTemplates (actions, { byComponent }) {
    const templates = new Map()

    const createTemplate = component => {
      if (byComponent.has(component)) {
        const template = byComponent.get(component)
        const contentType = actions.getContentType(template.typeName)

        templates.set(component, new Template(template, contentType, actions))
      }
    }

    const removeTemplate = component => {
      if (templates.has(component)) {
        templates.get(component).remove()
        templates.delete(component)
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
}

class Template {
  constructor (template, contentType, actions) {
    this.template = template
    this.contentType = contentType
    this.actions = actions

    if (typeof template.path === 'string') {
      this.route = actions._createRoute({
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

    if (this.route) this.actions._removeRoute(this.route.id)
    else this.actions.removePagesByComponent(component)
  }

  createPage (node) {
    const { fieldName, component } = this.template
    const queryVariables = node
    const path = node[fieldName]

    if (this.route) this.route.addPage({ path, queryVariables })
    else this.actions.createPage({ path, component, queryVariables })
  }

  updatePage (node, oldNode) {
    const { path, fieldName } = this.template

    if (node[fieldName] !== oldNode[fieldName] && !path) {
      this.actions.removePageByPath(node[fieldName])
    }

    this.createPage(node)
  }

  removePage (node) {
    this.actions.removePageByPath(
      node[this.template.fieldName]
    )
  }
}

const makePath = (object, { path, dateField, routeKeys, createPath }) => {
  if (typeof path === 'function') {
    return path(object)
  }

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

module.exports = TemplatesPlugin
