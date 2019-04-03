const pMap = require('p-map')
const axios = require('axios')
const { mapKeys, isPlainObject } = require('lodash')

const TYPE_AUTHOR = 'author'
const TYPE_ATTACHEMENT = 'attachment'

class WordPressSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      apiBase: 'wp-json',
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

    if (options.perPage > 100 || options.perPage < 1) {
      throw new Error(`${options.typeName}: perPage cannot be more than 100 or less than 1`)
    }

    this.client = axios.create({
      baseURL: `${options.baseUrl.replace(/\/+$/, '')}/${options.apiBase}`
    })

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
    const { data } = await this.fetch('wp/v2/types', {}, {})

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
    const { data } = await this.fetch('wp/v2/taxonomies', {}, {})

    for (const type in data) {
      const options = data[type]
      const typeName = store.makeTypeName(type)
      const route = this.routes[type] || `/${options.rest_base}/:slug`
      const collection = store.addContentType({ typeName, route })

      this.restBases.taxonomies[type] = options.rest_base

      const terms = await this.fetchPaged(`wp/v2/${options.rest_base}`)

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
async getFeaturedMedia (featured_media) {
    const image = await this.fetch('wp/v2/media/', { featured_media }, {})
    const fields = this.normalizeFields(image.data[0])
    return fields; 
}
  async getPosts (store) {
    for (const type in this.restBases.posts) {
      const restBase = this.restBases.posts[type]
      const typeName = store.makeTypeName(type)
      const collection = store.getContentType(typeName)

      const posts = await this.fetchPaged(`wp/v2/${restBase}`)

      for (const post of posts) {
        const fields = this.normalizeFields(post)

        fields.author = {
          typeName: store.makeTypeName(TYPE_AUTHOR),
          id: post.author || 0
        }

        if (post.type == 'post') {
	    if (post.featured_media != 0){
	        var featuredMedia = await this.getFeaturedMedia(post.featured_media);
		fields.featuredMedia = {
		    typeName: store.makeTypeName(TYPE_ATTACHEMENT),
		    id: post.featured_media,
		    url: featuredMedia.source_url,
		    width: featuredMedia.media_details.width,
		    height: featuredMedia.media_details.height,
		    altText: featuredMedia.alt_text
          	}
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
          modified: post.modified,
          slug: post.slug,
          fields
        })
      }
    }
  }

  async fetch (url, params = {}, fallbackData = []) {
    let res

    try {
      res = await this.client.request({ url, params })
    } catch ({ response }) {
      const { url } = response.config
      const { status } = response.data.data

      if ([401, 403].includes(status)) {
        console.warn(`Error: Status ${status} - ${url}`)
        return { ...response, data: fallbackData }
      } else {
        throw new Error(`Status ${status} - ${url}`)
      }
    }

    return res
  }

  async fetchPaged (path) {
    const { perPage, concurrent } = this.options

    return new Promise(async (resolve, reject) => {
      let res

      try {
        res = await this.fetch(path, { per_page: perPage })
      } catch (err) {
        return reject(err)
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

      const queue = []

      for (let page = 2; page <= totalPages; page++) {
        queue.push({ per_page: perPage, page })
      }

      await pMap(queue, async params => {
        try {
          const { data } = await this.fetch(path, params)
          res.data.push(...ensureArrayData(path, data))
        } catch (err) {
          console.log(err.message)
        }
      }, { concurrency: concurrent })

      resolve(res.data)
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
