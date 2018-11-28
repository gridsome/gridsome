const axios = require('axios')
const reduce = require('lodash.reduce')
const uniqBy = require('lodash.uniqby')
const { 
  toPascalCase
} = require('../utils')
const slugify = require('@sindresorhus/slugify')

class Entity {
  constructor(source, { entityType, entityName, type, url }) {
    this.source = source // instance of DrupalSource.js

    this.entityType = entityType
    this.entityName = entityName
    this.graphQlContentType // gridsome store api addConentType
    this.type = type // json:api type i.e. node--article
    this.relationshipTypes = [] // array of possible relationships
    this.url = url // url to fetch, pulled from apiSchema
    this.response = [] // response from this.fetchData
  }

  get getEntityType() {
    return this.entityType
  }

  get getEntityName() {
    return this.entityName
  }

  get getType() {
    return this.type
  }

  get getTypeName() {
    return this.createTypeName(this.type)
  }

  createTypeName(text = '') {
    return (text.endsWith('s'))
      ? toPascalCase(text)
      : `${toPascalCase(text)}s`
  }

  async fetchData() {
    try {
      const fetchRecurse = async (url) => {
      
        const {
          data: {
            data,
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
      throw new Error(message)
    }
  }

  createGraphQlType(override = {}) {
    const typeName = this.getTypeName
    const pathName = this.createTypeName(this.getEntityName) // sort of a round about way to add an "s"

    return Object.assign({ 
      typeName,
      route: `/${slugify(pathName)}/:slug`
    }, override)
  }

  processRelationships(relationships) {
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
            entityType: relationship.type
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
   *    type: 'file--file',
   *    rel: 123455
   *  },
   *  field_tags: {
   *    type: 'taxonomy_term--tags',
   *    rel: [123456, 78910]
   *  }
   * }
   */
  normalizeRelationships(relationships) {   
    try {
      return reduce(relationships, (result, relationship, key) => {
        let { data } = relationship

        if (data === null || data === undefined) return result

        let innerData = (!Array.isArray(data))
          ? [data]
          : data

        // if there is at least one entry AND this instance type isn't the same
        // if the types were the same you could have a Tag with a relationship of another Tag
        if (innerData.length > 0 && this.getType !== innerData[0].type) {
          if (!result[key]) {
            result[key] = {
              type: '',
              rel: []
            }
          }

          result[key].type = innerData[0].type
          result[key].rel = innerData.map(item => item.id)
        }
  
        return result
      }, {})
    } catch (error) {
      throw new Error('Issue with normalizing relationship')
    }
  }

  buildRelationships() {
    let { store: { getContentType } = {} } = this.source

    this.relationshipTypes.forEach((relationship) => {
      const { fieldName, entityType } = relationship
      const relTypeName = this.createTypeName(entityType)
 
      if (this.getType !== entityType && getContentType(relTypeName)) {
        this.graphQlContentType.addReference(fieldName, {
          typeName: relTypeName,
          key: 'id'
        })
      }
    })
  }
}

module.exports = Entity