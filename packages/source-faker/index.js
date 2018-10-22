const faker = require('faker')

class FakerSource {
  static defaultOptions () {
    return {
      numNodes: 500,
      typeName: 'Faker'
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options

    api.loadSource(() => this.createFakerNodes())
  }

  createFakerNodes () {
    const contentType = this.api.store.addContentType({
      typeName: this.options.typeName,
      route: '/:year/:month/:day/:slug'
    })

    for (let i = 0; i < this.options.numNodes; i++) {
      const random = faker.random.number({ min: 3, max: 6 })
      const title = faker.lorem.sentence(random).slice(0, -1)
      const created = faker.date.past(10)
      const updated = faker.date.between(created, new Date())

      const options = {
        title,
        id: faker.random.uuid(),
        slug: this.source.slugify(title),
        created: created,
        updated: updated,
        fields: {
          author: faker.name.findName(),
          date: faker.date.recent(),
          thumbnail: faker.image.people(),
          email: faker.internet.exampleEmail(),
          avatar: faker.image.avatar(),
          excerpt: faker.lorem.sentences(2),
          content: faker.lorem.paragraphs(10)
        }
      }

      try {
        contentType.addNode(options)
      } catch (err) {
        this.logger.warn(err.message)
      }
    }
  }
}

module.exports = FakerSource
