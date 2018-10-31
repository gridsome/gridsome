const axios = require('axios')
const Queue = require('better-queue')
const querystring = require('querystring')

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
    this.options = options

    api.loadSource(args => this.fetchWordPressContent(args))
  }

  async fetchWordPressContent ({ store }) {
    const { baseUrl, perPage, concurrent } = this.options
    let { routes } = this.options

    const restUrl = `${baseUrl.replace(/\/+$/, '')}/wp-json/wp/v2`
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
      ...routes
    }

    let types = {}
    let taxonomies = {}

    try {
      const res = await axios.get(`${restUrl}/types`)
      types = res.data
    } catch (err) {
      throw err
    }

    try {
      const res = await axios.get(`${restUrl}/taxonomies`)
      taxonomies = res.data
    } catch (err) {
      throw err
    }

    for (const type in types) {
      const options = types[type]

      const typeName = store.makeTypeName(type)
      const route = routes[type] || `/${options.rest_base}/:slug`

      restBases.posts[type] = options.rest_base

      const collection = store.addContentType({ typeName, route })

      if (type !== 'attachment') {
        const attachmentTypeName = store.makeTypeName('attachment')

        collection.addReference('featuredMedia', {
          typeName: attachmentTypeName,
          key: '_id'
        })

        // collection.addSchemaField('featuredMedia', ({ nodeTypes }) => ({
        //   type: nodeTypes[attachmentTypeName],
        //   async resolve (node, args, { store }) {
        //     const { collection } = store.getContentType(attachmentTypeName)
        //     return collection.findOne({ _id: node.fields.featuredMedia })
        //   }
        // }))
      }
    }

    for (const type in taxonomies) {
      const options = taxonomies[type]
      const typeName = store.makeTypeName(type)
      const route = routes[type] || `/${options.rest_base}/:slug`

      restBases.taxonomies[type] = options.rest_base

      for (const type of options.types) {
        const postTypeName = store.makeTypeName(type)
        const collection = store.getContentType(postTypeName)

        collection.addReference(options.rest_base, { typeName, key: '_id' })
      }

      store.addContentType({ typeName, route })
    }

    for (const type in restBases.posts) {
      const restBase = restBases.posts[type]
      const typeName = store.makeTypeName(type)
      const collection = store.getContentType(typeName)
      const endpoint = `${restUrl}/${restBase}`
      let posts = []

      try {
        posts = await fetchPaged(endpoint, { perPage, concurrent })
      } catch (err) {
        console.error(err.message)
      }

      for (const post of posts) {
        let fields = {}

        if (post.type === 'attachment') {
          fields.url = post.source_url
          fields.mediaType = post.media_type
          fields.mimeType = post.mime_type
          fields.width = post.media_details.width
          fields.height = post.media_details.height
        } else {
          fields.content = post.content ? post.content.rendered : ''
          fields.excerpt = post.excerpt ? post.excerpt.rendered : ''
          fields.featuredMedia = post.featured_media
        }
        
        // add references if post has any taxonomy rest bases as properties
        for (const type in restBases.taxonomies) {
          const propName = restBases.taxonomies[type]
          if (post.hasOwnProperty(propName)) {
            fields[propName] = post[propName]
          }
        }

        collection.addNode({
          _id: post.id,
          title: post.title ? post.title.rendered : '',
          date: post.date ? new Date(post.date) : null,
          slug: post.slug,
          fields
        })
      }
    }

    for (const type in restBases.taxonomies) {
      const restBase = restBases.taxonomies[type]
      const typeName = store.makeTypeName(type)
      const collection = store.getContentType(typeName)
      const endpoint = `${restUrl}/${restBase}`
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
