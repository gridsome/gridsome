const camelCase = require('camelcase')
const consola = require('consola')
const fs = require('fs-extra')
const got = require('got').default
const isPlainObject = require('lodash.isplainobject')
const os = require('os')
const pMap = require('p-map')
const path = require('path')
const stream = require('stream')
const { promisify } = require('util')

const TYPE_AUTHOR = 'author'
const TYPE_ATTACHMENT = 'attachment'

// Add prefix to error messages
const report = {
  info: msg => consola.info(`WordPress Source: ${msg}`),
  warn: msg => consola.warn(`WordPress Source: ${msg}`),
  error: msg => consola.error(`WordPress Source: ${msg}`)
}

class WordPressSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      apiBase: 'wp-json',
      perPage: 100,
      concurrent: os.cpus().length,
      typeName: 'WordPress',
      images: false
    }
  }

  constructor (api, options) {
    if (!options.baseUrl) {
      return report.error('Missing the `baseUrl` option - please add, and try again.')
    }

    if (!options.typeName) {
      options.typeName = 'WordPress'
      report.warn('Missing the `typeName` option - defaulting to `WordPress`.')
    }

    if (options.perPage > 100 || options.perPage < 1) {
      options.perPage = 100
      report.warn('`perPage` cannot be more than 100 or less than 1 - defaulting to 100.')
    }

    this.options = {
      ...options,
      baseUrl: options.baseUrl.replace(/\/$/, '')
    }
    this.restBases = { posts: {}, taxonomies: {}}

    this.customEndpoints = this.sanitizeCustomEndpoints()

    this.client = got.extend({
      prefixUrl: `${this.options.baseUrl}/${this.options.apiBase}`,
      searchParams: { per_page: this.options.perPage },
      resolveBodyOnly: true,
      responseType: 'json'
    })

    api.loadSource(async actions => {
      this.store = actions

      report.info(`Loading data from ${this.options.baseUrl}`)

      this.addSchemaTypes(actions)

      await this.getPostTypes(actions)
      await this.getUsers(actions)
      await this.getTaxonomies(actions)
      await this.getPosts(actions)
      await this.getCustomEndpoints(actions)
    })

    api.onBootstrap(async () => {
      this.downloadImages(api)
    })
  }

  addSchemaTypes (actions) {
    actions.addSchemaTypes(`
      type ${this.createTypeName(TYPE_ATTACHMENT)} implements Node @infer {
        downloaded: Image
      }
    `)
  }

  async getPostTypes (actions) {
    const data = await this.fetch('wp/v2/types', {}, {})

    for (const type in data) {
      const options = data[type]

      this.restBases.posts[type] = options.rest_base

      actions.addCollection(this.createTypeName(type))
    }
  }

  async getUsers (actions) {
    const data = await this.fetch('wp/v2/users')

    const authors = actions.addCollection(this.createTypeName(TYPE_AUTHOR))

    for (const author of data) {
      const fields = this.normalizeFields(author)

      const avatars = Object.entries(author.avatar_urls).reduce((obj, [key, value]) => ({ ...obj, [`avatar${key}`]: value }), {})

      authors.addNode({
        ...fields,
        id: author.id,
        title: author.name,
        avatars
      })
    }
  }

  async getTaxonomies (actions) {
    const data = await this.fetch('wp/v2/taxonomies', {}, {})

    for (const type in data) {
      const options = data[type]
      const taxonomy = actions.addCollection(this.createTypeName(type))

      this.restBases.taxonomies[type] = options.rest_base

      const terms = await this.fetchPaged(`wp/v2/${options.rest_base}`)

      for (const term of terms) {
        taxonomy.addNode({
          id: term.id,
          title: term.name,
          slug: term.slug,
          content: term.description,
          meta: term.meta,
          count: term.count
        })
      }
    }
  }

  async getPosts (actions) {
    const AUTHOR_TYPE_NAME = this.createTypeName(TYPE_AUTHOR)
    const ATTACHMENT_TYPE_NAME = this.createTypeName(TYPE_ATTACHMENT)

    for (const type in this.restBases.posts) {
      const restBase = this.restBases.posts[type]
      const typeName = this.createTypeName(type)
      const posts = actions.getCollection(typeName)

      const data = await this.fetchPaged(`wp/v2/${restBase}`)

      for (const post of data) {
        const fields = this.normalizeFields(post)

        fields.author = actions.createReference(AUTHOR_TYPE_NAME, post.author || '0')

        if (post.type !== TYPE_ATTACHMENT) {
          fields.featuredMedia = actions.createReference(ATTACHMENT_TYPE_NAME, post.featured_media)
        }

        // add references if post has any taxonomy rest bases as properties
        for (const type in this.restBases.taxonomies) {
          const propName = this.restBases.taxonomies[type]

          if (post.hasOwnProperty(propName)) {
            const typeName = this.createTypeName(type)
            const key = camelCase(propName)

            fields[key] = Array.isArray(post[propName])
              ? post[propName].map(id => actions.createReference(typeName, id))
              : actions.createReference(typeName, post[propName])
          }
        }

        posts.addNode({ ...fields, id: post.id })
      }
    }
  }

  async getCustomEndpoints (actions) {
    for (const endpoint of this.customEndpoints) {
      const customCollection = actions.addCollection(endpoint.typeName)

      const data = await this.fetch(endpoint.route, {}, {})

      for (let item of data) {
        if (endpoint.normalize) {
          item = this.normalizeFields(item)
        }

        customCollection.addNode({
          ...item,
          id: item.id || item.slug
        })
      }
    }
  }

  async fetch (url, params = {}, fallbackData = []) {
    try {
      const data = await this.client.get(url, { searchParams: params })
      return data
    } catch ({ response }) {
      report.error(`Status ${response.statusCode} fetching ${response.requestUrl}`)
      return fallbackData
    }
  }

  async fetchPaged (path) {
    const { headers } = await this.client.head(path, { resolveBodyOnly: false })

    const totalItems = parseInt(headers['x-wp-total'], 10)
    const totalPages = parseInt(headers['x-wp-totalpages'], 10)

    if (!totalItems) return []

    const queue = [...Array(totalPages)].map((_, i) => i + 1)

    const allData = await pMap(queue, async page => {
      try {
        const data = await this.fetch(path, { page })
        return this.ensureArrayData(path, data)
      } catch (error) {
        report.error(error.message)
      }
    }, { concurrency: this.options.concurrent })

    return allData.flat()
  }

  async downloadImages (api) {
    if (!this.options.images) return
    const { original = false, folder = '.images/wordpress', cache = true, concurrent = os.cpus().length } = this.options.images

    const imageStore = api._store.getCollection(this.createTypeName(TYPE_ATTACHMENT))
    const images = imageStore.data()

    const pipeline = promisify(stream.pipeline)

    await pMap(images, async image => {
      const { pathname } = new URL(image.sourceUrl)
      const { name, dir, ext } = path.parse(pathname)

      const targetFileName = original ? name : image.id
      const targetFolder = path.join(process.cwd(), folder, original ? dir : '')

      const filePath = path.format({ ext, name: targetFileName, dir: targetFolder })

      const updatedNode = { ...image, downloaded: filePath }

      if (cache && await fs.pathExists(filePath)) return imageStore.updateNode(updatedNode)

      try {
        await fs.ensureFile(filePath)
        await pipeline(
          got.stream(image.sourceUrl),
          fs.createWriteStream(filePath)
        )

        return imageStore.updateNode(updatedNode)
      } catch (error) {
        report.error(error.message)
      }
    }, { concurrency: concurrent })
  }

  sanitizeCustomEndpoints () {
    if (!this.options.customEndpoints) return []
    if (!Array.isArray(this.options.customEndpoints)) {
      return report.error('`customeEndpoints` must be an array.')
    }
    this.options.customEndpoints.forEach(endpoint => {
      if (!endpoint.typeName) {
        return report.error('Please provide a `typeName` option for all customEndpoints')
      }
      if (!endpoint.route) {
        return report.error(`\`route\` option is missing in endpoint ${endpoint.typeName}. Ex: \`apiName/versionNumber/endpointObject\``)
      }
    })
    return this.options.customEndpoints ? this.options.customEndpoints : []
  }

  ensureArrayData (url, data) {
    if (Array.isArray(data)) return data

    try {
      data = JSON.parse(data)
    } catch (err) {
      report.error(`Failed to fetch ${url} - expected JSON response, but received ${typeof data} type.`)
    }
  }

  normalizeFields (fields) {
    const res = {}

    for (const key in fields) {
      if (key.startsWith('_')) continue // skip links and embeds etc
      res[camelCase(key)] = this.normalizeFieldValue(fields[key])
    }

    return res
  }

  normalizeFieldValue (value) {
    if (value === null) return null
    if (value === undefined) return null

    if (Array.isArray(value)) {
      return value.map(v => this.normalizeFieldValue(v))
    }

    if (isPlainObject(value)) {
      if (value.post_type && (value.ID || value.id)) {
        const typeName = this.createTypeName(value.post_type)
        const id = value.ID || value.id

        return this.store.createReference(typeName, id)
      } else if (value.filename && (value.ID || value.id)) {
        const typeName = this.createTypeName(TYPE_ATTACHMENT)
        const id = value.ID || value.id

        return this.store.createReference(typeName, id)
      } else if (value.hasOwnProperty('rendered')) {
        return value.rendered
      }

      return this.normalizeFields(value)
    }

    return value
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}

module.exports = WordPressSource
