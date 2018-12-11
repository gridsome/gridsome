const axios = require('axios')
const { forEach, uniq } = require('lodash')
const { cullByWordCount } = require('./utils')
const { DEFAULT_EXCLUDES } = require('./constants')
const Entity = require('./Entity')

class DrupalSource {
  // defaultOptions merged with this.options in App.vue
  static defaultOptions () {
    return {
      apiBase: 'jsonapi',
      baseUrl: '',
      excludes: [],
      format: 'json',
      requestConfig: {},
      typeName: 'Drupal',
    }
  }

  constructor (api, options = {}) {
    if (!options.baseUrl) throw new Error('baseUrl option is required')

    this.options = options
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
    const { typeName, baseUrl, apiBase, requestConfig } = this.options

    if (!baseUrl || !typeName) throw new Error('Missing required fields in gridsome.config.js')

    const fullBaseUrl = baseUrl.endsWith('/')
      ? `${baseUrl}${apiBase}`
      : `${baseUrl}/${apiBase}`

    try {
      const response = await axios.get(fullBaseUrl, requestConfig)

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
   */
  async processEntities () {
    const { excludes: userExcludes = [] } = this.options

    try {
      const capturedEntities = []
      // create unique array of user passed excludes and defaultExcludes
      const excludes = userExcludes.length ? uniq(userExcludes) : DEFAULT_EXCLUDES

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
    } catch ({ message }) {
      throw new Error(`processEntities(): ${message}`)
    }
  }
}

module.exports = DrupalSource
