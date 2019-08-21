const axios = require('axios')
const { reduce } = require('lodash')
const camelCase = require('camelcase')

class Entity {
  constructor (source, { entityType, url }) {
    this.source = source // instance of DrupalSource.js

    this.entityType = entityType
    this.graphQlContentType // gridsome store api addConentType
    this.url = url // url to fetch, pulled from apiSchema
    this.response = [] // response from this.fetchData
  }

  get typeName () {
    return this.createTypeName(this.entityType)
  }

  createTypeName (value = '') {
    const { typeName } = this.source.options
    let res = value

    // this converts 'file--file' to just 'file'
    if (res.includes('--')) {
      const _split = res.split('--')
      if (_split[0] === _split[1]) res = _split[0]
    }

    return camelCase(`${typeName} ${res}`, { pascalCase: true })
  }

  async initialize () {
    await this.fetchData()

    // don't build the graphQl if there is no response
    this.response.length
      ? await this.buildGraphQl()
      : console.log(`${this.typeName} has no entities`)
  }

  async fetchData () {
    try {
      const {
        options: {
          requestConfig = {}
        } = {}
      } = this.source
      const fetchRecurse = async (url) => {
        url = typeof url === 'object' ? url.href : url

        const {
          data: {
            data = [],
            links: {
              next
            }
          } = {}
        } = await axios.get(url, requestConfig)

        this.response = this.response.concat(data)

        if (next) await fetchRecurse(next)
        else return
      }

      return fetchRecurse(this.url)
    } catch (error) {
      // should catch 403s and 405
      // throw Error stops process from running
      const {
        message,
        response: {
          status
        } = {}
      } = error

      if (String(status).startsWith(4) || String(status).startsWith(5)) {
        console.error(`fetchData(): ${message}`)
      } else {
        throw new Error(`fetchData(): ${this.typeName} ${message}`)
      }
    }
  }

  async buildGraphQl () {
    const options = this.createContentTypeOptions()
    this.graphQlContentType = this.source.store.addContentType(options)

    for (const item of this.response) {
      const fields = this.processFields(item.attributes)
      const relationships = this.processRelationships(item.relationships)
      const origin = typeof item.links.self === 'object'
        ? item.links.self.href
        : item.links.self

      this.graphQlContentType.addNode({
        title: fields.title || fields.name,
        date: fields.created || fields.changed,
        ...fields,
        ...relationships,
        id: item.id,
        internal: { origin }
      })
    }
  }

  processFields (fields = {}) {
    const processedFields = reduce(fields, (newFields, field, key) => {
      newFields[key] = (field !== 'null') ? field : ''

      return newFields
    }, {})

    return processedFields
  }

  createContentTypeOptions (override = {}) {
    const {
      store,
      options: {
        typeName: prefix,
        routes = {}
      } = {}
    } = this.source

    const typeNamePrefix = store.slugify(prefix)

    // turn DrupalTaxonomyTermTag into 'taxonomy-term-tag'
    const slug = store.slugify(this.typeName)
    const fallbackSlug = (slug.split(`${typeNamePrefix}-`)[1])
      ? slug.split(`${typeNamePrefix}-`)[1]
      : slug

    return Object.assign({
      typeName: this.typeName,
      route: routes[this.entityType] || `/${fallbackSlug}/:id`
    }, override)
  }

  processRelationships (relationships) {
    return reduce(relationships, (result, relationship, key) => {
      const { data } = relationship

      if (data !== null) {
        result[key] = Array.isArray(data)
          ? data.map(relation => this.createReference(relation))
          : this.createReference(data)
      }

      return result
    }, {})
  }

  createReference (data) {
    const { createReference } = this.source.store
    const typeName = this.createTypeName(data.type)

    return {
      node: createReference(typeName, data.id),
      meta: data.meta
    }
  }
}

module.exports = Entity
