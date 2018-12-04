const axios = require('axios')
const { reduce, uniqBy } = require('lodash')

class Entity {
  constructor (source, { entityType, url }) {
    this.source = source // instance of DrupalSource.js

    this.entityType = entityType
    this.graphQlContentType // gridsome store api addConentType
    this.relationshipTypes = [] // array of possible relationships
    this.url = url // url to fetch, pulled from apiSchema
    this.response = [] // response from this.fetchData
  }

  get getEntityType () {
    return this.entityType
  }

  get getEntityTypeName () {
    return this.createTypeName(this.getEntityType)
  }

  createTypeName (text = '') {
    let innerText = text

    // this converts 'file--file' to just 'file'
    if (innerText.includes('--')) {
      const _split = innerText.split('--')
      if (_split[0] === _split[1]) innerText = _split[0]
    }

    const { store } = this.source

    return (innerText.endsWith('s'))
      ? store.makeTypeName(innerText)
      : `${store.makeTypeName(innerText)}s`
  }

  async initialize () {
    try {
      console.log(`Intializing ${this.getEntityTypeName}...`)

      await this.fetchData()

      // don't build the graphQl if there is no response
      if (this.response.length) await this.buildGraphQl()
      else console.log(`${this.getEntityTypeName} has no values in response`)

      console.log(`${this.getEntityTypeName} initialzed...`)
      return
    } catch (error) {
      const {
        message,
        response: {
          status
        } = {}
      } = error

      if (String(status).startsWith(4) || String(status).startsWith(5)) {
        console.error(`initialize(): ${this.getEntityTypeName} ${message}`)
      } else {
        throw new Error(`initialize(): ${this.getEntityTypeName} ${message}`)
      }
    }
  }

  async fetchData () {
    try {
      const fetchRecurse = async (url) => {
        url = typeof url === 'object' ? url.href : url

        const {
          data: {
            data = [],
            links: {
              next
            }
          } = {}
        } = await axios.get(url)

        this.response = this.response.concat(data)

        if (next) await fetchRecurse(next)
        else return
      }

      return fetchRecurse(this.url)
    } catch ({ message }) {
      // should catch 403s and 405
      // throw Error stops process from running
      console.error(`fetchData(): ${this.getEntityTypeName} ${message}`)
    }
  }

  async buildGraphQl () {
    console.log('Building GraphQL for: ', this.getEntityTypeName)

    try {
      const { store } = this.source
      const { addContentType } = store

      const config = this.createGraphQlType()
      this.graphQlContentType = addContentType(config)

      for (const item of this.response) {
        const {
          id,
          attributes,
          attributes: {
            title,
            name,
            created,
            changed
          } = {},
          relationships
        } = item

        const fields = this.processFields(attributes)
        const relationshipFields = this.processRelationships(relationships)

        this.graphQlContentType.addNode({
          id,
          title: title || name,
          date: created || changed,
          fields: {
            ...fields,
            ...relationshipFields
          }
        })
      }
    } catch ({ message }) {
      throw new Error(`${this.getEntityTypeName} ${message}`)
    }
  }

  processFields (fields = {}) {
    try {
      const processedFields = reduce(fields, (newFields, field, key) => {
        newFields[key] = (field !== 'null') ? field : ''

        return newFields
      }, {})

      return processedFields
    } catch ({ message }) {
      throw new Error(`${this.getEntityTypeName} ${message}`)
    }
  }

  createGraphQlType (override = {}) {
    let {
      store,
      options: {
        typeName: prefix,
        routes = {}
      } = {}
    } = this.source

    prefix = store.slugify(prefix)

    // turn DrupalTaxonomyTermTags into 'taxonomy-term-tags'
    const slug = store.slugify(this.getEntityTypeName)
    const getRouteSlug = (slug.split(`${prefix}-`)[1])
      ? slug.split(`${prefix}-`)[1]
      : slug

    // if user provided custom route in options, use that instead
    const typeName = this.getEntityTypeName
    const route = routes[this.getEntityType] || `/${getRouteSlug}/:slug`

    return Object.assign({
      typeName,
      route
    }, override)
  }

  processRelationships (relationships) {
    try {
      const relationshipFields = this.normalizeRelationships(relationships)

      /**
       * this converts the output from normalizeRelationships
       * into a uniq array of:
       * 
       * [ { fieldName, entitType }, { fieldName, entitType } ]
       * 
       * i.e.
       * [ 
       *  { fieldName: 'field_images', entityType: 'file--file' },
       *  { fieldName: 'field_tags', entityType: 'taxonomy_term--tags' }
       * ]
       * 
       * no two will be alike based on "entityType" property
       * this is set to the instance property "relationshipTypes"
       * which is layer used by buildRelationships (see processEntities in DrupalSource)
       */
      this.relationshipTypes = uniqBy(
        this.relationshipTypes.concat(
          reduce(relationshipFields, (result, relationship, key) => {
            result.push({
              fieldName: key,
              entityType: relationship.entityType
            })

            return result
          }, [])
        ),
        'entityType'
      )

      return reduce(relationshipFields, (result, relationship, key) => {
        result[key] = relationship.rel

        return result
      }, {})
    } catch ({ message }) {
      throw new Error(`${this.getEntityTypeName} ${message}`)
    }
  }

  /**
   * This function turns this:
   * field_image: {
   *  data: {
   *    type: 'file--file',
   *    id: 123456
   *  }
   * },
   * field_tags: {
   *  data: [
   *    {
   *      type: 'taxonomy_term--tags',
   *      id: 123456
   *    },
   *    {
   *      type: 'taxonomy_term--tags',
   *      id: 78910
   *    },
   *  ]
   *  }
   * }
   * 
   * Into this:
   * 
   * {
   *  field_image: {
   *    entityType: 'file--file',
   *    rel: 123455
   *  },
   *  field_tags: {
   *    entityType: 'taxonomy_term--tags',
   *    rel: [123456, 78910]
   *  }
   * }
   */
  normalizeRelationships (relationships) {   
    try {
      return reduce(relationships, (result, relationship, key) => {
        const { data } = relationship

        if (data === null || data === undefined) return result

        const innerData = (!Array.isArray(data))
          ? [data]
          : data

        // if there is at least one entry AND this instance type isn't the same
        // if the types were the same you could have a Tag with a relationship of another Tag
        if (innerData.length > 0 && this.getEntityType !== innerData[0].type) {
          if (!result[key]) {
            result[key] = {
              entityType: '',
              rel: []
            }
          }

          result[key].entityType = innerData[0].type
          result[key].rel = innerData.map(item => item.id)
        }

        return result
      }, {})
    } catch (error) {
      throw new Error('Issue with normalizing relationship')
    }
  }

  buildRelationships () {
    const { store: { getContentType } = {} } = this.source

    this.relationshipTypes.forEach((relationship) => {
      const { fieldName, entityType } = relationship
      const relTypeName = this.createTypeName(entityType)
 
      if (this.getEntityType !== entityType && getContentType(relTypeName)) {
        this.graphQlContentType.addReference(fieldName, {
          typeName: relTypeName,
          key: 'id'
        })
      }
    })
  }
}

module.exports = Entity
