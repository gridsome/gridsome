const StoryblokClient = require('storyblok-js-client')

module.exports = function (api, options) {
  var Storyblok = new StoryblokClient({
    accessToken: options.queryParams.token
  })

  api.loadSource(async store => {
    const { data } = await Storyblok.get('cdn/stories/', options.queryParams)

    const contentType = store.addContentType({
      typeName: options.typeName
    })

    for (const item of data.stories) {
      contentType.addNode({
        id: item.id,
        slug: item.slug,
        fields: {
          published: item.published_at,
          created: item.created_at,
          ...item.content
        }
      })
    }
  })
}
