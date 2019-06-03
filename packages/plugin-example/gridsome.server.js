/**
 * @param api     	Server API instance
 * @param options   Plugin options
 * Docs: https://gridsome.org/docs/server-api
 */


class ExamplePlugin {
  static defaultOptions () {
    return {
      typeName: 'ExampleData',
      route: '/example/:slug'
    }
  }

  constructor (api, options) {

    api.loadSource(store => {
     	
      	// Creates a content type
      const posts = store.addContentType({
        typeName: options.typeName,
        route: options.route
      })

      	// Add content nodes
      posts.addNode({
        title: 'Example post',
        content: 'Lorem ipsum dolor sit amet, consectetur...',
      })

      posts.addNode({
        title: 'Another post',
        content: 'Lorem ipsum dolor sit amet, consectetur...',
      })

    })
  }
}
module.exports = ExamplePlugin