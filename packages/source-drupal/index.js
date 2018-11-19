const axios = require('axios')
const { 
  slugify,
  cullByWordCount
} = require('./utils')

class DrupalSource {
  static defaultOptions () {
    return {
      baseUrl: '',
      types: [],
      format: 'json'
    }
  }

  constructor (api, options = {}) {
    if (!options.baseUrl) throw new Error('baseUrl option is required')

    this.options = { ...this.defaultOptions, ...options }

    api.loadSource(store => this.fetchDrupalViews(store))
  }

  async fetchDrupalViews(store) {
    const { addContentType } = store
    const { baseUrl, types, format } = this.options

    try {
      let results = await Promise.all(
        types.map(({ restPath }) => {
          if (!restPath) throw new Error('restPath is a required for each type object')

          return axios.get(`${baseUrl}${restPath}/?_format=${format}`)
        })
      )

      // loop through each type specified in gridsome.config.js
      // create GraphQL Type and all the nodes for that type
      types.forEach(({ name, route }, index) => {
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
