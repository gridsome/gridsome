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

    api.loadSource(args => this.fetchWordPressContent(args))
  }

  async fetchWordPressContent (store) {
    const { addContentType, getContentType, makeTypeName } = store
    const { baseUrl, perPage, concurrent } = this.options
    let { routes } = this.options

    const restUrl = `${baseUrl.replace(/\/+$/, '')}/wp-json`
    const restBases = { posts: {}, taxonomies: {}}

    try {
      await axios.get(restUrl)
    } catch (err) {
      throw new Error(`Failed to fetch baseUrl ${baseUrl}`)
    }

    routes = {
      post: '/:year/:month/:day/:slug',
      post_tag: '/tag/:slug',
      category: '/category/:slug',
      author: '/author/:slug',
      ...routes
    }

    let users = {}
    let types = {}
    let taxonomies = {}

    try {
      const res = await axios.get(`${restUrl}/wp/v2/users`)
      users = res.data
    } catch (err) {
      throw err
    }

    try {
      const res = await axios.get(`${restUrl}/wp/v2/types`)
      types = res.data
    } catch (err) {
      throw err
    }

    try {
      const res = await axios.get(`${restUrl}/wp/v2/taxonomies`)
      taxonomies = res.data
    } catch (err) {
      throw err
    }

    const authors = addContentType({
      typeName: makeTypeName(TYPE_AUTHOR),
      route: routes.author
    })

    for (const user of users) {
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

    for (const type in types) {
      const options = types[type]
      const typeName = makeTypeName(type)
      const route = routes[type] || `/${options.rest_base}/:slug`

      restBases.posts[type] = options.rest_base

      addContentType({ typeName, route })
    }

    for (const type in taxonomies) {
      const options = taxonomies[type]
      const typeName = makeTypeName(type)
      const route = routes[type] || `/${options.rest_base}/:slug`

      restBases.taxonomies[type] = options.rest_base

      addContentType({ typeName, route })
    }

    for (const type in restBases.posts) {
      const restBase = restBases.posts[type]
      const typeName = makeTypeName(type)
      const collection = getContentType(typeName)
      const endpoint = `${restUrl}/wp/v2/${restBase}`
      let posts = []

      try {
        posts = await fetchPaged(endpoint, { perPage, concurrent })
      } catch (err) {
        console.error(err.message)
      }

      for (const post of posts) {
        const fields = this.normalizeFields(post)

        fields.author = {
          typeName: makeTypeName(TYPE_AUTHOR),
          id: post.author || 0
        }

        if (post.type !== 'attachment') {
          fields.featuredMedia = {
            typeName: makeTypeName(TYPE_ATTACHEMENT),
            id: post.featured_media
          }
        }

        // add references if post has any taxonomy rest bases as properties
        for (const type in restBases.taxonomies) {
          const propName = restBases.taxonomies[type]
          if (post.hasOwnProperty(propName)) {
            fields[propName] = {
              typeName: makeTypeName(type),
              id: post[propName]
            }
          }
        }

        collection.addNode({
          id: post.id,
          title: post.title ? post.title.rendered : '',
          date: post.date ? new Date(post.date) : null,
          slug: post.slug,
          fields
        })
      }
    }

    for (const type in restBases.taxonomies) {
      const restBase = restBases.taxonomies[type]
      const typeName = makeTypeName(type)
      const collection = getContentType(typeName)
      const endpoint = `${restUrl}/wp/v2/${restBase}`
      let terms = []

      try {
        terms = await fetchPaged(endpoint, { perPage, concurrent })
      } catch (err) {
        console.error(err.message)
      }

      for (const term of terms) {
        collection.addNode({
          _id: term.id,
          slug: term.slug,
          title: term.name,
          fields: {
            count: term.count
          }
        })
      }
    }
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
          id: value.ID
        }
      } else if (value.filename && (value.ID || value.id)) {
        return {
          typeName: makeTypeName(TYPE_ATTACHEMENT),
          id: value.ID
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

function fetchPaged (url, options = {}) {
  return new Promise(async (resolve, reject) => {
    const query = querystring.stringify({ per_page: options.perPage })
    const endpoint = `${url}?${query}`
    let res

    try {
      res = await axios.get(endpoint)
    } catch (err) {
      return reject(new Error(`${err.message}: ${endpoint}`))
    }

    const totalItems = parseInt(res.headers['x-wp-total'], 10)
    const totalPages = parseInt(res.headers['x-wp-totalpages'], 10)

    try {
      res.data = ensureArrayData(url, res.data)
    } catch (err) {
      return reject(err)
    }

    if (!totalItems || totalPages <= 1) {
      return resolve(res.data)
    }

    const queue = new Queue(taskHandler, {
      concurrent: options.concurrent
    })

    for (let page = 2; page <= totalPages; page++) {
      const query = querystring.stringify({ per_page: options.perPage, page })
      queue.push({ id: `${url}?${query}` })
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
