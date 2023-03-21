const GhostContentAPI = require('@tryghost/content-api')
const camelCase = require('camelcase')
const schemaTypes = require('./ghost-schema')

const TYPE_AUTHOR = 'author'
const TYPE_POST = 'post'
const TYPE_PAGE = 'page'
const TYPE_TAG = 'tag'

class GhostSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      contentKey: '',
      perPage: 100,
      version: 'v3',
      typeName: 'Ghost',
      settingsName: null
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options
    this.restBases = { posts: {}, taxonomies: {}}
    this.typeNames = {
      author: this.createTypeName(TYPE_AUTHOR),
      post: this.createTypeName(TYPE_POST),
      page: this.createTypeName(TYPE_PAGE),
      tag: this.createTypeName(TYPE_TAG)
    }

    this.contentAPI = new GhostContentAPI({
      url: options.baseUrl,
      key: options.contentKey,
      version: options.version
    })

    if (options.perPage > 100 || options.perPage < 1) {
      throw new Error(`${options.typeName}: perPage cannot be more than 100 or less than 1`)
    }

    api.loadSource(async actions => {
      console.log(`Loading data from ${options.baseUrl}`)
      await this.loadAuthors(actions)
      await this.loadPosts(actions)
      await this.loadTags(actions)
      await this.loadPages(actions)
      await this.loadSettings(actions)
    })

    api.createSchema(async ({ addSchemaTypes }) => {
      addSchemaTypes(schemaTypes.GhostAuthor(this.typeNames))
      addSchemaTypes(schemaTypes.GhostTag(this.typeNames))
      addSchemaTypes(schemaTypes.GhostPost(this.typeNames))
      addSchemaTypes(schemaTypes.GhostPage(this.typeNames))
    })
  }

  async loadTags ({ addCollection }) {
    console.log(`Loading ${TYPE_TAG}`)
    const tags = addCollection({
      typeName: this.typeNames.tag
    })

    await this.loadBasicEntity(tags, this.contentAPI.tags)
  }

  async loadPages ({ addCollection, createReference }) {
    console.log(`Loading ${TYPE_PAGE}`)
    const pages = addCollection({
      typeName: this.typeNames.page,
      dateField: 'published_at'
    })
    const tagTypeName = this.typeNames.tag
    const authorTypeName = this.typeNames.author

    let keepGoing = true
    let currentPage = 1

    while (keepGoing) {
      const entities = await this.contentAPI.pages.browse({
        limit: this.options.perPage,
        include: 'tags,authors',
        page: currentPage
      })

      entities.forEach(entity => {
        const { tags = [], authors = [], ...options } = entity
        const { primary_tag, primary_author } = options // eslint-disable-line

        options.primary_tag = primary_tag // eslint-disable-line
          ? createReference(tagTypeName, primary_tag.id)
          : null
        options.primary_author = createReference(authorTypeName, primary_author.id)
        options.tags = tags.map(tag => createReference(tagTypeName, tag.id))
        options.authors = authors.map(author => createReference(authorTypeName, author.id))

        pages.addNode(options)
      })

      if (currentPage === entities.meta.pagination.pages) {
        keepGoing = false
      }

      currentPage++
    }
  }

  async loadAuthors ({ addCollection }) {
    console.log(`Loading ${TYPE_AUTHOR}`)
    const authors = addCollection({
      typeName: this.typeNames.author
    })

    await this.loadBasicEntity(authors, this.contentAPI.authors)
  }

  async loadPosts ({ createReference, addCollection }) {
    console.log(`Loading ${TYPE_POST}`)
    const posts = addCollection({
      typeName: this.typeNames.post,
      dateField: 'published_at'
    })

    const tagTypeName = this.typeNames.tag
    const authorTypeName = this.typeNames.author

    let keepGoing = true
    let currentPage = 1

    while (keepGoing) {
      const entities = await this.contentAPI.posts.browse({
        limit: this.options.perPage,
        include: 'tags,authors',
        page: currentPage
      })

      entities.forEach(entity => {
        const { tags = [], authors = [], ...options } = entity
        const { primary_tag, primary_author } = options // eslint-disable-line

        options.primary_tag = primary_tag // eslint-disable-line
          ? createReference(tagTypeName, primary_tag.id)
          : null
        options.primary_author = createReference(authorTypeName, primary_author.id)
        options.tags = tags.map(tag => createReference(tagTypeName, tag.id))
        options.authors = authors.map(author => createReference(authorTypeName, author.id))

        posts.addNode(options)
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

    store.addMetadata(fieldName, settings)
  }

  async loadBasicEntity (collection, contentEntity) {
    let keepGoing = true
    let currentPage = 1

    while (keepGoing) {
      const entities = await contentEntity.browse({
        limit: this.options.perPage,
        page: currentPage
      })

      entities.forEach(entity => {
        collection.addNode(entity)
      })

      if (currentPage === entities.meta.pagination.pages) {
        keepGoing = false
      }

      currentPage++
    }
  }

  createTypeName (typeName = '') {
    return camelCase(`${this.options.typeName} ${typeName}`, { pascalCase: true })
  }
}

module.exports = GhostSource
