const axios = require('axios')
const { forEach, uniq } = require('lodash')
const { cullByWordCount } = require('./utils')
const { DEFAULT_ENTITIES, DEFAULT_EXCLUDES } = require('./constants')
const Entity = require('./entities/Entity')

class DrupalSource {
  // defaultOptions merged with this.options in App.vue
  static defaultOptions () {
    return {
      typeName: 'Drupal',
      baseUrl: '',
      apiBase: 'jsonapi',
      views: [], // deprecated
      entities: [],
      excludes: [],
      format: 'json'
    }
  }

  constructor (api, options = {}) {
    if (!options.baseUrl) throw new Error('baseUrl option is required')

    this.options = options
    this.defaultEntities = DEFAULT_ENTITIES
    this.defaultExcludes = DEFAULT_EXCLUDES
    this.entities = {}
    this.apiSchema = {}

    api.loadSource(store => this.initialize(store))
  }

  async initialize (store) {
    try {
      this.store = store
      this.apiSchema = await this.fetchJsonApiSchema()

      await this.processEntities()
    } catch (error) {
      const { message } = error
      throw new Error(message)
    }
  }

  /**
   * fetches /${baseUrl}/${apiBase}
   * 
   * this response should be the jsonapi schema
   * this function pulls the "links" property out of the response
   */
  async fetchJsonApiSchema () {
    const { typeName, baseUrl, apiBase } = this.options

    if (!baseUrl || !typeName) throw new Error('Missing required fields in gridsome.config.js')

    const fullBaseUrl = baseUrl.endsWith('/')
      ? `${baseUrl}${apiBase}`
      : `${baseUrl}/${apiBase}`

    try {
      const response = await axios.get(fullBaseUrl)

      /**
       * response from /jsonapi with axios wrapper is shaped:
       * data: {
       *  data: {},
       *  links: {}
       * }
       */
      const { data: { links } = {} } = response

      return links
    } catch (error) {
      const { message } = error
      throw new Error(message)
    }
  }

  /**
   * This method loops over the apiShema created in fetchJsonApiSchema
   * if property key (in the apiScheme object) is not in the exlucdes list, it creates a new instance
   *
   * Once each entityType is processed, loop through again and buildRelationships()
   */
  async processEntities () {
    const { excludes: userExcludes = [] } = this.options

    try {
      const capturedEntities = []
      // create unique array of user passed entities and defaultEntities
      const excludes = uniq(this.defaultExcludes.concat(userExcludes))

      // loop through all the properties in apiSchema and create Entity instances
      // excluding any property with a key that is in DEFAULT_EXCLUDES
      forEach(this.apiSchema, (url, entityType) => {
        if (!excludes.includes(entityType)) {
          // creating an instance of the entity class, see ./entities/*
          this.entities[entityType] = new Entity(this, { entityType, url })

          capturedEntities.push(this.entities[entityType])
        }
      })

      await Promise.all(capturedEntities.map(entity => entity.initialize()))

      // this needs to happen after ALL entities have been processed
      // so we know which graphQl content types exist
      // see Entity.buildRelationships() -> this method check if contentType has been added
      for (const key in this.entities) {
        this.entities[key].buildRelationships()
      }
    } catch ({ message }) {
      throw new Error(`processEntities(): ${message}`)
    }
  }

  // TODO: deprecated
  async fetchDrupalViews (store) {
    const { addContentType } = store
    const { baseUrl, views, format } = this.options

    try {
      const results = await Promise.all(
        views.map(({ restPath }) => {
          if (!restPath) throw new Error('restPath is a required for each type object')

          return axios.get(`${baseUrl}${restPath}/?_format=${format}`)
        })
      )

      // loop through each type specified in gridsome.config.js
      // create GraphQL Type and all the nodes for that type
      views.forEach(({ name, route }, index) => {
        const { slugify } = this.store
        if (!name) throw new Error('name is a required for each type object')

        const type = addContentType({
          typeName: name,
          route: route || `/${slugify(name)}/:slug`
        })
        const { data = [] } = results[index]

        for (const item of data) {
          const {
            id,
            title,
            body,
            content,
            slug,
            date,
            excerpt,
            ...fields 
          } = item

          // use body as a fallback
          const _content = content || body

          type.addNode({
            id,
            slug: slug || slugify(title),
            title,
            content: _content,
            date,
            excerpt: excerpt || cullByWordCount(_content)(20),
            fields: {
              ...fields // spreads out any additional properties into fields object
            }
          })
        }
      })
    } catch (error) {
      throw new Error(error)
    }
  }
}

module.exports = DrupalSource
