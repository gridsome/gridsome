const Strapi = require('strapi-sdk-javascript').default

class StrapiSource {
  static defaultOptions () {
    return {
      apiUrl: undefined,
      typeName: 'StrapiSource_',
      query: undefined
    }
  }

  constructor (api, options) {
    this.options = options
    api.loadSource(args => this.fetchContent(args))
  }

  async fetchContent (store) {
    const { addContentType } = store
    const { apiUrl, query, typeName } = this.options

    const strapi = new Strapi(apiUrl)
    const response = await strapi.request('post', '/graphql', {
      data: { query: query }
    })

    // TODO error checking here
    Object.keys(response.data).forEach((itemTopLevel) => {
      const strapiData = addContentType({
        typeName: typeName + itemTopLevel
      })
      response.data[itemTopLevel].forEach((subItem) => {
        strapiData.addNode({
          fields: { ...subItem }
        })
      })
    })
  }
}

module.exports = StrapiSource
