const pMap = require('p-map')
const got = require('got').default
const camelCase = require('camelcase')
const isPlainObject = require('lodash.isplainobject')

const TYPE_AUTHOR = 'author'
const TYPE_ATTACHMENT = 'attachment'

class WordPressSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      apiBase: 'wp-json',
      perPage: 100,
      concurrent: 10,
      typeName: 'WordPress'
    }
  }

  constructor (api, options) {
    this.options = options
    this.restBases = { posts: {}, taxonomies: {}}

    if (!options.typeName) {
      throw new Error(`Missing typeName option.`)
    }

    if (options.perPage > 100 || options.perPage < 1) {
      throw new Error(`${options.typeName}: perPage cannot be more than 100 or less than 1.`)
    }

    this.customEndpoints = this.sanitizeCustomEndpoints()

    this.client = got.extend({
      prefixUrl: `${options.baseUrl}/${options.apiBase}`,
      resolveBodyOnly: true,
      responseType: 'json'
    })

    api.loadSource(async actions => {
      this.store = actions

      console.log(`Loading data from ${options.baseUrl}`)

      await this.getPostTypes(actions)
      await this.getUsers(actions)
      await this.getTaxonomies(actions)
      await this.getPosts(actions)
      await this.getCustomEndpoints(actions)
    })
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
      const data = await this.client.get(url)
      return data
    } catch (e) {
      console.log(e)
      return fallbackData
      // if (!response && code) {
      //   throw new Error(`${code} - ${config.url}`)
      // }

      // if ([401, 403].includes(response.status)) {
      //   console.warn(`Error: Status ${response.status} - ${config.url}`)
      //   return { ...response, data: fallbackData }
      // } else {
      //   throw new Error(`${response.status} - ${config.url}`)
      // }
    }
  }

  async fetchPaged (path) {
    const { perPage, concurrent } = this.options

    const { headers } = await this.client.head(path, { resolveBodyOnly: false })

    const totalItems = parseInt(headers['x-wp-total'], 10)
    const totalPages = parseInt(headers['x-wp-totalpages'], 10)

    if (!totalItems) return []

    const queue = [...Array(totalPages)].map((_, page) => ({ per_page: perPage, page }))

    const allData = await pMap(queue, async params => {
      try {
        const data = await this.fetch(path, params)
        return this.ensureArrayData(path, data)
      } catch (err) {
        console.log(err.message)
      }
    }, { concurrency: concurrent })

    return allData.flat()
  }

  sanitizeCustomEndpoints () {
    if (!this.options.customEndpoints) return []
    if (!Array.isArray(this.options.customEndpoints)) throw Error('customEndpoints must be an array')
    this.options.customEndpoints.forEach(endpoint => {
      if (!endpoint.typeName) {
        throw Error('Please provide a typeName option for all customEndpoints\n')
      }
      if (!endpoint.route) {
        throw Error(`No route option in endpoint: ${endpoint.typeName}\n Ex: 'apiName/versionNumber/endpointObject'`)
      }
    })
    return this.options.customEndpoints ? this.options.customEndpoints : []
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
w
  ensureArrayData (url, data) {
    if (Array.isArray(data)) return data

    try {
      data = JSON.parse(data)
    } catch (err) {
      throw new Error(
        `Failed to fetch ${url} -\n` +
        `Expected JSON response, but received ${typeof data}:\n` +
        `${data.trim().substring(0, 150)}...\n`
      )
    }
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}

module.exports = WordPressSource
