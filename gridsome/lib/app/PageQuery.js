const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')
const { print } = require('graphql')
const { omit, get } = require('lodash')
const { parseQuery } = require('../graphql')
const { error, info } = require('../utils/log')

const isDev = process.env.NODE_ENV === 'development'

const componentsPath = ['src/components/**/*.vue', 'src/layouts/**/*.vue']

class PageQuery {
  constructor(app) {
    this.app = app
    this.schema = null
    this.components = new Map()
    this.fragments = new Map()
    this.usedFragments = new Map()

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
    definedFragment = definedFragment.concat(get(this.components.get(resourcePath), 'defineFragments', []))
    if(event === 'delete') {
      this.deleteByPath(resourcePath)
      return
    }
    this.parseComponent(resourcePath)
    definedFragment = definedFragment.concat(get(this.components.get(resourcePath), 'defineFragments', []))
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

  getFragmentsDefinitions() {
    const definitions = {}
    this.fragments.forEach(({ fragment }, key) => {
      definitions[key] = fragment
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
    if (!pageQuery && this.components.has(resourcePath)) {
      this.deleteByPath(resourcePath)
    }
    return pageQuery && this.parseQuery(pageQuery, resourcePath)
  }

  deleteByPath (resourcePath) {
    const prev = this.components.get(resourcePath)
    this.components.delete(resourcePath)

    prev.defineFragments.forEach((name) => {
      this.fragments.delete(name)
    })

    prev.usedFragments.forEach((name) => {
      this.usedFragments.delete(name)
    })
  }

  parseQuery (pageQuery, resourcePath) {
    // if components has allready parsed delete previous data to update
    if (this.components.has(resourcePath)) {
      this.deleteByPath(resourcePath)
    }
    const parsed = parseQuery(this.schema, pageQuery, resourcePath)

    const defineFragments = []
    const _fragments = new Map(this.fragments)
    parsed.fragments.forEach((fragment) => {
      const defName = fragment.name.value
      defineFragments.push(defName)

      // Detect duplicated fragments
      if (_fragments.has(defName)) {
        error(`Duplicate fragment "${defName}" in ${resourcePath}`, '[PageQuery]')
        info(`\n${print(fragment)}\n`)
        // We don't know which one to use so we delete both and save in duplicate
        _fragments.delete(defName)
        return
      }

      _fragments.set(defName, {
        name: defName,
        fragment,
        resourcePath
      })
    })
    this.fragments = _fragments


    const needFragments = []
    const usedFragments = []
    const _usedFragments = new Map(this.usedFragments)
    parsed.usedFragments = parsed.neededFragments.reduce((acc, needed) => {
      const neededName = needed.name.value
      needFragments.push(neededName)

      if (this.fragments.has(neededName)) {
        usedFragments.push(neededName)
        _usedFragments.set(neededName, needed)
        // If definition of fragment is not in same component but exist
        if (parsed.fragments.findIndex(({ name }) => name.value === neededName) === -1) {
          acc.push(neededName)
          parsed.document.definitions.push(this.fragments.get(neededName).fragment)
        }
      }
      return acc
    }, [])
    this.usedFragments = _usedFragments

    this.components.set(resourcePath, {
      defineFragments,
      needFragments,
      usedFragments
    })

    return parsed
  }
}

module.exports = PageQuery
