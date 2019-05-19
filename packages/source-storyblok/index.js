class StoryblokSource {
  defaultOptions () {
    return {
      typeName: 'Storyblok',
      accessToken: undefined,
      resolveLinks: undefined,
      resolveRelations: undefined,
      dataSources: {},
      stories: {
        article: { typeName: 'Article' }
      }
    }
  }

  constructor (api, options) {
    const StoryblokClient = require('storyblok-js-client')

    this.options = options
    this.client = new StoryblokClient({
      accessToken: options.accessToken
    })

    api.loadSource(async store => {
      await this.loadStories(store)
      await this.loadDataSources(store)
    })
  }

  async loadStories (store) {
    const { stories, resolveRelations, resolveLinks } = this.options

    for (const key in stories) {
      const config = typeof stories[key] === 'string'
        ? { typeName: stories[key] }
        : stories[key]

      if (!config.typeName) {
        throw new Error(`No typeName defined for ${key}.`)
      }

      const collection = store.addContentType({ dateField: 'published_at', ...config })

      const { data } = await this.client.get('cdn/stories', {
        resolve_links: resolveRelations || config.resolveLinks || 1,
        resolve_relations: resolveLinks || config.resolveRelations,
        filter_query: {
          component: {
            in: key
          }
        },
        ...config.args
      })

      for (const story of data.stories) {
        collection.addNode({ ...story, id: String(story.id) })
      }
    }
  }

  async loadDataSources (store) {
    for (const key in this.options.dataSources) {
      const config = this.options.dataSources[key]

      const res = await this.client.get('cdn/datasource_entries', {
        dimension: config.dimension,
        datasource: key,
        ...config.args
      })

      const data = res.data.datasource_entries.reduce((acc, entry) => {
        const { name, ...value } = entry
        acc[name] = value
        return acc
      }, {})

      store.addMetaData(config.fieldName || key, data)
    }
  }
}

module.exports = StoryblokSource
