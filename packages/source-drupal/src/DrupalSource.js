const axios = require('axios')
const { reduce, uniq } = require('lodash')
const { 
  cullByWordCount
} = require('./utils')
const slugify = require('@sindresorhus/slugify')
const Nodes = require('./entities/Nodes')
const TaxonomyTerms = require('./entities/TaxonomyTerms')
const Files = require('./entities/Files')
const Users = require('./entities/Users')


class DrupalSource {
  // defaultOptions merged with this.options in App.vue
  static defaultOptions() {
    return {
      baseUrl: '',
      apiBase: 'jsonapi',
      views: [], // deprecated
      entities: [],
      format: 'json'
    }
  }

  constructor(api, options = {}) {
    if (!options.baseUrl) throw new Error('baseUrl option is required')

    this.options = options
    this.defaultEntities = ['node', 'taxonomy_term', 'file', 'user']
    this.supportedEntities = {
      node: Nodes,
      taxonomy_term: TaxonomyTerms,
      file: Files,
      user: Users,
    }
    this.entities = {}
    this.apiSchema = {}

    api.loadSource(store => this.initialize(store))
  }

  async initialize(store) {
    try {
      this.store = store
      this.apiSchema = await this.fetchJsonApiSchema()

      await this.processEntities()
    } catch (error) {
      let { message } = error
      throw new Error(message)
    }
  }

  async fetchJsonApiSchema() {
    const { baseUrl, apiBase } = this.options

    if (!baseUrl) throw new Error('baseUrl is required in gridsome.config.js')

    const fullBaseUrl = baseUrl.endsWith('/') 
      ? `${baseUrl}${apiBase}`
      : `${baseUrl}/${apiBase}`

    try {
      let response = await axios.get(fullBaseUrl)

      /**
       * response from /jsonapi with axios wrapper is shaped:
       * data: {
       *  data: {},
       *  links: {}
       * }
       */
      let { data: { links } = {} } = response

      /**
       * normalize /jsonapi reponse
       * turn this:
       * {
       *  'node--article': 'some url',
       *  'taxonomy_term--category': 'some url',
       *  ...
       * }
       * 
       * into this:
       * [
       *  {
       *    entityType: 'node',
       *    entityName: 'article',
       *    type: 'node--article',
       *    url: '<jsonapi endpoint>'
       *  },
       *  {
       *    entityType: 'taxonomy_term',
       *    entityName: 'tags',
       *    type: 'taxonomy_term--tags',
       *    url: '<jsonapi endpoint>'
       *  },
       * 
       * ]
       */
      return reduce(links, (result, value, key) => {
        const keySplit = key.split('--') // [entityType, type, url]

        result.push({
          entityType: keySplit[0],
          entityName: (keySplit.length > 1) ? keySplit[1] : keySplit[0],
          type: key,
          url: value
        })

        return result
      }, [])
    } catch (error) {
      let { message } = error
      throw new Error(message)
    }
  }

  /**
   * This method loops over the apiShema created in fetchJsonApiSchema
   * if entityType (in the apiScheme object) is supported, it creates a new instance
   * of that supported entity (see the initialize() method in all /src/entities/*)
   * 
   * Once each entityType is processed, loop through again and buildRelationships()
   */
  async processEntities() {
    let { entities: userEntities = [] } = this.options

    // create unique array of user passed entities and defaultEntities
    const entities = uniq(this.defaultEntities.concat(userEntities))

    await Promise.all(
      this.apiSchema.map((api) => {
        let { entityType, entityName, type, url } = api
        
        if (this.supportedEntities[entityType] && entities.includes(entityType)) {
          // creating an instance of the entity class, see ./entities/*
          this.entities[type] = new this.supportedEntities[entityType](this, { entityType, entityName, type, url })
          return this.entities[type].initialize()
        }
      })
    )
    
    // this needs to happen after ALL entities have been processed
    // so we know which graphQl content types exist
    // see Entity.buildRelationships() -> this method check if contentType has been added
    for (let key in this.entities) {
      this.entities[key].buildRelationships()
    }
  }
 
  // TODO: deprecated
  async fetchDrupalViews(store) {
    const { addContentType } = store
    const { baseUrl, views, format } = this.options

    try {
      let results = await Promise.all(
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
          route: (route) ? route : `/${slugify(name)}/:slug`
        })
        const { data = [] } = results[index]

        for (let item of data) {
          let {
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
