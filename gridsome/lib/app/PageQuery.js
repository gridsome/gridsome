const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')
const compiler = require('vue-template-compiler')
const crypto = require('crypto')
const { Collection } = require('lokijs')
const { parse } = require('@vue/component-compiler-utils')
const { omit } = require('lodash')
const { parseQuery } = require('../graphql')

const isDev = process.env.NODE_ENV === 'development'

const componentsPath = ['src/components/**/*.vue', 'src/layouts/**/*.vue']

class PageQuery {
  constructor(app) {
    this.app = app
    this.schema = null
    this.fragments = new Collection('fragments', {
      indices: ['name', 'use', 'define'],
      unique: ['name']
    })

    if (isDev) {
      this.watcher = chokidar.watch(componentsPath, { cwd: this.app.context, ignoreInitial: true })
      this.watcher.on('add', (path) => this.parseComponent(path))
      this.watcher.on('change', (path) => this.watchedFile(path, 'change'))
      this.watcher.on('unlink', (path) => this.watchedFile(path, 'unlink'))
    }
  }

  /**
   * Initialized by Schema.buildSchema to ensure schema is ready
   */
  init(schema) {
    this.schema = schema

    glob.sync(componentsPath, { cwd: this.app.context })
      .forEach((resourcePath) => this.parseComponent(resourcePath))
  }

  watchedFile (resourcePath, event) {
    let definedFragment = []
    // Get previous definedFragment
    definedFragment = definedFragment.concat(this._getFragmentsName({ define: { '$contains': resourcePath } }))
    if(event === 'delete') {
      this.deleteByPath(resourcePath)
      return
    }
    this.parseComponent(resourcePath)
    // Get new definedFragment
    definedFragment = definedFragment.concat(this._getFragmentsName({ define: { '$contains': resourcePath } }))
    // Dedup fragments names
    definedFragment = [...new Set(definedFragment)]

    // Update routes need fragments
    const routes = this.app.pages._routes.where(({ internal: { query } }) =>
      query.neededFragments.some(({ name }) => definedFragment.includes(name.value))
    )
    routes.forEach((route) => {
      this.app.pages.updateRoute(omit(route, ['internal', '$loki']))
    })
  }

  _getFragmentsName(query) {
    return this.fragments.find(query).map(({ name }) => (name))
  }

  getFragmentsDefinitions() {
    const definitions = {}
    this.fragments.chain().data().forEach(({ name, fragment }) => {
      definitions[name] = fragment
    })
    return definitions
  }

  getPageQuery (source, filename) {
    const { customBlocks } = parse({ filename, source, compiler })
    const pageQuery = customBlocks.find(block => block.type === 'page-query')
    return pageQuery ? pageQuery.content : false
  }

  parseComponent (resourcePath) {
    const filename = path.parse(resourcePath).name
    const pageQuery = this.getPageQuery(fs.readFileSync(path.resolve(this.app.context, resourcePath), 'utf-8'), filename)
    // If have no longer page-query remove previous data
    if (!pageQuery) {
      this.deleteByPath(resourcePath)
    }
    return pageQuery && this.parseQuery(pageQuery, resourcePath)
  }

  deleteByPath (resourcePath) {
    const references = this.fragments.find({
      '$or': [
        {
          use: {
            '$contains': resourcePath
          }
        },
        {
          define: {
            '$contains': resourcePath
          }
        }
      ]
    })

    references.forEach((fragment) => {
      if (fragment.define.includes(resourcePath)) {
        fragment.define = fragment.define.filter((path) => path !== resourcePath)
      }
      if (fragment.use.includes(resourcePath)) {
        fragment.use = fragment.use.filter((path) => path !== resourcePath)
      }

      // If is no longer define remove fragment
      if (fragment.define.length < 1) {
        return this.fragments.remove(fragment)
      }
      this.fragments.update(fragment)
    })
  }

  parseQuery (pageQuery, resourcePath) {
    // Clear previous references
    this.deleteByPath(resourcePath)
    const parsed = parseQuery(this.schema, pageQuery, resourcePath)

    const defineFragments = []
    parsed.fragments.forEach((fragment) => {
      const defName = fragment.name.value
      defineFragments.push(defName)

      // Detect duplicated fragments
      const prevDefinition = this.fragments.by('name', defName)
      if (typeof prevDefinition !== 'undefined') {
        this.fragments.update({
          ...prevDefinition,
          define: prevDefinition.define.concat(resourcePath)
        })
        return
      }

      this.fragments.insert({
        name: defName,
        fragment,
        resourcePath,
        define: [resourcePath],
        use: []
      })
    })

    parsed.usedFragments = parsed.neededFragments.reduce((acc, needed) => {
      const neededName = needed.name.value

      const needFragment = this.fragments.by('name', neededName)
      if (typeof needFragment !== 'undefined') {
        this.fragments.update({
          ...needFragment,
          use: needFragment.use.concat(resourcePath)
        })

        // If definition of fragment is not in same component but exist
        if (parsed.fragments.findIndex(({ name }) => name.value === neededName) === -1) {
          acc.push(neededName)
          parsed.document.definitions.push(needFragment.fragment)
        }
      }
      return acc
    }, [])

    parsed.hashFragments = crypto.createHash('md5').update(parsed.usedFragments.join('-')).digest('hex')

    return parsed
  }
}

module.exports = PageQuery
