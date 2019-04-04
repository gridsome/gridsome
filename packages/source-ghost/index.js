const GhostContentAPI = require('@tryghost/content-api')

const TYPE_AUTHOR = 'AUTHOR'
const TYPE_POST = 'POST'
const TYPE_PAGE = 'PAGE'
const TYPE_TAG = 'TAG'

class GhostSource {
  static defaultOptions () {
    return {
      url: '',
      key: '',
      perPage: 100,
      version: 'v2',
      typeName: 'Ghost'
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options
    this.restBases = { posts: {}, taxonomies: {}}

    this.contentAPI = new GhostContentAPI({
      url: options.url,
      key: options.key,
      version: options.version
    })

    if (options.perPage > 100 || options.perPage < 1) {
      throw new Error(`${options.typeName}: perPage cannot be more than 100 or less than 1`)
    }

    this.routes = {
      post: '/:year/:month/:day/:slug',
      tag: '/tag/:slug',
      page: '/page/:slug',
      author: '/author/:slug',
      ...this.options.routes
    }

    api.loadSource(async store => {
      console.log(`Loading data from ${options.url}`)
      await this.loadAuthors(store)
      await this.loadPosts(store)
      await this.loadTags(store)
      await this.loadPages(store)
    })
  }

  async loadTags (store) {
    console.log('Processing Tags...')

    const tags = store.addContentType({
      typeName: store.makeTypeName(TYPE_TAG),
      route: this.routes.tags
    })

    await this.loadBasicEntity(tags, this.contentAPI.tags)
  }

  async loadPages (store) {
    console.log('Processing Pages...')

    const pages = store.addContentType({
      typeName: store.makeTypeName(TYPE_PAGE),
      route: this.routes.pages
    })

    await this.loadBasicEntity(pages, this.contentAPI.pages)
  }

  async loadAuthors (store) {
    console.log('Processing Authors...')

    const authors = store.addContentType({
      typeName: store.makeTypeName(TYPE_AUTHOR),
      route: this.routes.author
    })

    await this.loadBasicEntity(authors, this.contentAPI.authors)
  }
  async loadPosts (store) {
    console.log('Processing Posts...')
    const posts = store.addContentType({
      typeName: store.makeTypeName(TYPE_POST),
      route: this.routes.post
    })

    var keepGoing = true
    var currentPage = 1

    while (keepGoing) {
      const rawEntities = await this.contentAPI.posts.browse({
        limit: this.options.perPage,
        page: currentPage,
        include: 'tags,authors'
      })

      rawEntities.forEach((entity) => {
        var tags = entity.tags
        var parsedTags = []

        tags.forEach(tag => {
          parsedTags.push({
            typeName: store.makeTypeName(TYPE_TAG),
            id: tag.id
          })
        })

        var authors = entity.authors
        var parsedAuthors = []

        authors.forEach(tag => {
          parsedAuthors.push({
            typeName: store.makeTypeName(TYPE_AUTHOR),
            id: tag.id
          })
        })

        entity.authors = parsedAuthors

        posts.addNode({
          id: entity.id,
          title: entity.name,
          slug: entity.slug,
          fields: {
            ...entity
          }
        })
      })
      if (currentPage === rawEntities.meta.pagination.pages) {
        keepGoing = false
      }
      currentPage++
    }
  }

  async loadBasicEntity (collection, contentEntity) {
    var keepGoing = true
    var currentPage = 1

    while (keepGoing) {
      const rawEntities = await contentEntity.browse({
        limit: this.options.perPage,
        page: currentPage
      })

      rawEntities.forEach((entity) => {
        collection.addNode({
          id: entity.id,
          title: entity.name,
          slug: entity.slug,
          fields: {
            ...entity
          }
        })
      })
      if (currentPage === rawEntities.meta.pagination.pages) {
        keepGoing = false
      }
      currentPage++
    }
  }
}

module.exports = GhostSource
