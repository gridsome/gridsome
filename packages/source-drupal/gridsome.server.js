const axios = require('axios')
const { forEach, uniq } = require('lodash')
const { DEFAULT_EXCLUDES } = require('./lib/constants')
const Entity = require('./lib/Entity')

class DrupalSource {
  // defaultOptions merged with this.options in App.vue
  static defaultOptions () {
    return {
      apiBase: 'jsonapi',
      baseUrl: '',
      exclude: [],
      format: 'json',
      requestConfig: {},
      routes: {},
      typeName: 'Drupal'
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

  async initialize (actions) {
    this.apiSchema = await this.fetchJsonApiSchema()

    await this.processEntities(actions)
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
      const {
        data: {
          links
        } = {}
      } = response

      return links
    } catch (error) {
      const { message } = error
      throw new Error(message)
    }
  }

  /**
   * This method loops over the apiShema created in fetchJsonApiSchema
   * if property key (in the apiScheme object) is not in the excludes list, it creates a new instance
   */
  async processEntities (actions) {
    const { exclude: userExclude = [] } = this.options
    const capturedEntities = []
    // create unique array of user passed exclude and defaultExcludes
    const exclude = userExclude.length ? uniq(userExclude) : DEFAULT_EXCLUDES

    // loop through all the properties in apiSchema and create Entity instances
    // excluding any property with a key that is in DEFAULT_EXCLUDES
    forEach(this.apiSchema, (url, entityType) => {
      if (!exclude.includes(entityType)) {
        // creating an instance of the entity class, see ./entities/*
        this.entities[entityType] = new Entity(this, actions, { entityType, url })

        capturedEntities.push(this.entities[entityType])
      }
    })

    await Promise.all(capturedEntities.map(entity => entity.initialize()))
  }
}

module.exports = DrupalSource
