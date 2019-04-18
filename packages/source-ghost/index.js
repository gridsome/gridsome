const GhostContentAPI = require('@tryghost/content-api')
const camelCase = require('camelcase')

const TYPE_AUTHOR = 'author'
const TYPE_POST = 'post'
const TYPE_PAGE = 'page'
const TYPE_TAG = 'tag'

class GhostSource {
  static defaultOptions () {
    return {
      url: '',
      key: '',
      perPage: 100,
      version: 'v2',
      typeName: 'Ghost',
      settingsName: null
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
      await this.loadSettings(store)
    })
  }

  async loadTags (store) {
    const tags = store.addContentType({
      typeName: store.makeTypeName(TYPE_TAG),
      route: this.routes[TYPE_TAG]
    })

    await this.loadBasicEntity(tags, this.contentAPI.tags)
  }

  async loadPages (store) {
    const pages = store.addContentType({
      typeName: store.makeTypeName(TYPE_PAGE),
      route: this.routes[TYPE_PAGE]
    })

    await this.loadBasicEntity(pages, this.contentAPI.pages)
  }

  async loadAuthors (store) {
    const authors = store.addContentType({
      typeName: store.makeTypeName(TYPE_AUTHOR),
      route: this.routes[TYPE_AUTHOR]
    })

    await this.loadBasicEntity(authors, this.contentAPI.authors)
  }

  async loadPosts (store) {
    const posts = store.addContentType({
      typeName: store.makeTypeName(TYPE_POST),
      route: this.routes[TYPE_POST]
    })

    const tagTypeName = store.makeTypeName(TYPE_TAG)
    const authorTypeName = store.makeTypeName(TYPE_AUTHOR)

    let keepGoing = true
    let currentPage = 1

    while (keepGoing) {
      const entities = await this.contentAPI.posts.browse({
        limit: this.options.perPage,
        page: currentPage,
        include: 'tags,authors'
      })

      entities.forEach(entity => {
        const { id, title, slug, tags = [], authors = [], ...fields } = entity
        const { primary_author = {}, primary_tag = {}} = entity // eslint-disable-line
        const { published_at: date } = entity // eslint-disable-line

        fields.primary_tag = store.createReference(tagTypeName, primary_tag.id)
        fields.primary_author = store.createReference(authorTypeName, primary_author.id)
        fields.tags = tags.map(tag => store.createReference(tagTypeName, tag.id))
        fields.authors = authors.map(author => store.createReference(authorTypeName, author.id))

        posts.addNode({ id, title, slug, date, fields })
      })

      if (currentPage === entities.meta.pagination.pages) {
        keepGoing = false
      }

      currentPage++
    }
  }

  async loadSettings (store) {
    const { settingsName, typeName } = this.options
    const settings = await this.contentAPI.settings.browse()
    const fieldName = settingsName || camelCase(typeName)

    store.addMetaData(fieldName, settings)
  }

  async loadBasicEntity (collection, contentEntity) {
    let keepGoing = true
    let currentPage = 1

    while (keepGoing) {
      const entities = await contentEntity.browse({
        limit: this.options.perPage,
        page: currentPage
      })

      entities.forEach(({ id, name: title, slug, ...fields }) => {
        collection.addNode({ id, title, slug, fields })
      })

      if (currentPage === entities.meta.pagination.pages) {
        keepGoing = false
      }

      currentPage++
    }
  }
}

module.exports = GhostSource
