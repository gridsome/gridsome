const axios = require('axios')
const Queue = require('better-queue')
const querystring = require('querystring')
const { mapKeys, isPlainObject } = require('lodash')

const TYPE_AUTHOR = 'author'
const TYPE_ATTACHEMENT = 'attachment'

class WordPressSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      perPage: 100,
      concurrent: 10,
      routes: {},
      typeName: 'WordPress'
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options
    this.restBases = { posts: {}, taxonomies: {}}
    this.restUrl = `${options.baseUrl.replace(/\/+$/, '')}/wp-json`

    this.routes = {
      post: '/:year/:month/:day/:slug',
      post_tag: '/tag/:slug',
      category: '/category/:slug',
      author: '/author/:slug',
      ...this.options.routes
    }

    api.loadSource(async store => {
      console.log(`Loading data from ${options.baseUrl}`)

      await this.getPostTypes(store)
      await this.getUsers(store)
      await this.getTaxonomies(store)
      await this.getPosts(store)
    })
  }

  async getPostTypes (store) {
    const { data } = await this.fetch('wp/v2/types')

    for (const type in data) {
      const options = data[type]
      const typeName = store.makeTypeName(type)
      const route = this.routes[type] || `/${options.rest_base}/:slug`

      this.restBases.posts[type] = options.rest_base

      store.addContentType({ typeName, route })
    }
  }

  async getUsers (store) {
    const { data } = await this.fetch('wp/v2/users')

    const authors = store.addContentType({
      typeName: store.makeTypeName(TYPE_AUTHOR),
      route: this.routes.author
    })

    for (const user of data) {
      authors.addNode({
        id: user.id,
        title: user.name,
        slug: user.slug,
        fields: {
          ...this.normalizeFields(user),
          avatars: mapKeys(user.avatar_urls, (v, key) => `avatar${key}`)
        }
      })
    }
  }

  async getTaxonomies (store) {
    const { data } = await this.fetch('wp/v2/taxonomies')

    for (const type in data) {
      const options = data[type]
      const typeName = store.makeTypeName(type)
      const route = this.routes[type] || `/${options.rest_base}/:slug`
      const collection = store.addContentType({ typeName, route })

      this.restBases.taxonomies[type] = options.rest_base

      let terms = []

      try {
        terms = await this.fetchPaged(`wp/v2/${options.rest_base}`)
      } catch (err) {
        console.error(err.message)
      }

      for (const term of terms) {
        collection.addNode({
          id: term.id,
          slug: term.slug,
          title: term.name,
          content: term.description,
          fields: {
            count: term.count
          }
        })
      }
    }
  }

  async getPosts (store) {
    for (const type in this.restBases.posts) {
      const restBase = this.restBases.posts[type]
      const typeName = store.makeTypeName(type)
      const collection = store.getContentType(typeName)
      let posts = []

      try {
        posts = await this.fetchPaged(`wp/v2/${restBase}`)
      } catch (err) {
        console.error(err.message)
      }

      for (const post of posts) {
        const fields = this.normalizeFields(post)

        fields.author = {
          typeName: store.makeTypeName(TYPE_AUTHOR),
          id: post.author || 0
        }

        if (post.type !== 'attachment') {
          fields.featuredMedia = {
            typeName: store.makeTypeName(TYPE_ATTACHEMENT),
            id: post.featured_media
          }
        }

        // add references if post has any taxonomy rest bases as properties
        for (const type in this.restBases.taxonomies) {
          const propName = this.restBases.taxonomies[type]
          if (post.hasOwnProperty(propName)) {
            fields[propName] = {
              typeName: store.makeTypeName(type),
              id: post[propName]
            }
          }
        }

        collection.addNode({
          id: post.id,
          title: post.title ? post.title.rendered : '',
          date: post.date,
          slug: post.slug,
          fields
        })
      }
    }
  }

  async fetch (path) {
    return axios.get(`${this.restUrl}/${path}`)
  }

  async fetchPaged (path) {
    const { perPage, concurrent } = this.options

    return new Promise(async (resolve, reject) => {
      const query = querystring.stringify({ per_page: perPage })
      const endpoint = `${this.restUrl}/${path}?${query}`
      let res

      try {
        res = await axios.get(endpoint)
      } catch (err) {
        return reject(new Error(`${err.message}: ${endpoint}`))
      }

      const totalItems = parseInt(res.headers['x-wp-total'], 10)
      const totalPages = parseInt(res.headers['x-wp-totalpages'], 10)

      try {
        res.data = ensureArrayData(path, res.data)
      } catch (err) {
        return reject(err)
      }

      if (!totalItems || totalPages <= 1) {
        return resolve(res.data)
      }

      const queue = new Queue(taskHandler, { concurrent })

      for (let page = 2; page <= totalPages; page++) {
        const query = querystring.stringify({ per_page: perPage, page })
        queue.push({ id: `${this.restUrl}/${path}?${query}` })
      }

      queue.on('task_failed', (id, err) => {
        reject(new Error(`${err.message}: ${id}`))
        queue.destroy()
      })

      queue.on('task_finish', (id, { data }) => {
        try {
          res.data.push(...ensureArrayData(id, data))
        } catch (err) {
          return reject(err)
        }
      })

      queue.on('drain', () => {
        resolve(res.data)
      })
    })
  }

  normalizeFields (fields) {
    const res = {}

    for (const key in fields) {
      if (key.startsWith('_')) continue // skip links and embeds etc
      res[key] = this.normalizeFieldValue(fields[key])
    }

    return res
  }

  normalizeFieldValue (value) {
    if (value === null) return null
    if (value === undefined) return null

    const { makeTypeName } = this.api.store

    if (Array.isArray(value)) {
      return value.map(v => this.normalizeFieldValue(v))
    }

    if (isPlainObject(value)) {
      if (value.post_type && (value.ID || value.id)) {
        return {
          typeName: makeTypeName(value.post_type),
          id: value.ID || value.id
        }
      } else if (value.filename && (value.ID || value.id)) {
        return {
          typeName: makeTypeName(TYPE_ATTACHEMENT),
          id: value.ID || value.id
        }
      } else if (value.hasOwnProperty('rendered')) {
        return value.rendered
      }

      return this.normalizeFields(value)
    }

    return value
  }
}

async function taskHandler (task, cb) {
  try {
    const response = await axios.get(task.id)
    cb(null, response)
  } catch (err) {
    cb(err)
  }
}

function ensureArrayData (url, data) {
  if (!Array.isArray(data)) {
    try {
      data = JSON.parse(data)
    } catch (err) {
      throw new Error(
        `Failed to fetch ${url}\n` +
        `Expected JSON response but received:\n` +
        `${data.trim().substring(0, 150)}...\n`
      )
    }
  }
  return data
}

module.exports = WordPressSource
